var path = require("path")
var express = require('express');
var app = express();

var http = require('http');
var server = http.Server(app);

var socket = require('socket.io');
var io = socket(server);

var port = 3000;

app.use(express.static(__dirname + '/public'));
app.use('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/public', 'index.html'))
});
let userList=[]
let round = 0
let turn = 0
let goldCount = 0

io.on('connection', (socket) => {
  console.log("SOCKETIO Connect EVENT: ", socket.id, " client Connect");
  io.emit('broadcast', `${socket.id}님이 참여했음`);
  userList.push(socket.id)
  io.emit('userList', userList)
  
  //호준 채팅
  socket.on('chat', (data) => {
    io.emit('chat', data)
  })


  socket.on('gameStart', ()=>{
    console.log('게임시작');

    //초기화
    round = 0
    turn = 0
    goldCount = 0

    numberOfPlayer = userList.length
    //크라켄 (무조건 1장)
    craken = ['크라켄']
    //보물상자 (플레이어 수 만큼) 
    gold = Array(numberOfPlayer).fill('보물상자')
    //빈상자 (4n-1만큼)
    empty = Array(4 * numberOfPlayer - 1).fill('빈상자')

    //플레이어수 4인 이하 스켈레톤 1명고정 
    //5~6인 1~2, 7~8인 2~3
    if(numberOfPlayer >= 5){
      skeletonCount = Math.ceil(numberOfPlayer/2)-2 + parseInt(Math.random()*10)%2
      skeleton = Array(skeletonCount).fill("스켈레톤")
    } else {
      skeleton = ["스켈레톤"]
    }
    //스켈레톤 인원 확정후 나머지 탐험대
    explorer = Array(numberOfPlayer - skeleton.length).fill("탐험대")
    //스켈레톤, 탐험대 역할 합치기
    role = [...skeleton, ...explorer]

    //크라켄 + 보물상자 + 빈상자 한 덱으로 합치고
    deck = [...craken, ...gold, ...empty]

    //덱을 섞어 섞어
    // deck.sort(() => Math.random() - Math.random())
    shuffleArray(deck)
    //역할배정 섞기
    // role.sort(() => Math.random() - Math.random())
    shuffleArray(role)

    //플레이어는 최대 8명

    //뽑힌카드
    pickedCards = []

    users = [...userList].map((x, i) => {
      return {
        id   : userList[i],
        role : role[i],
        deck : deck.splice(0, 5)
      }
    })

    game = {
      round,
      turn,
      currentOrder : 0,
      pickedCards:[],
      users
    }
    console.log(game);

    io.emit('game', game)
  })

  //선택
  socket.on('pick', ({i,j}) => {
    console.log('픽 : ', i+1,'번 플레이어의 ', j+1, '번째 카드를 골랐습니다.');
    
    //덱에서 카드 뽑고
    pickedCard = game.users[i].deck.splice(j, 1)[0]
    game.currentOrder = i

    //뽑은게 크라켄이면 게임종료 (스켈레톤팀 승리)
    if(pickedCard == '크라켄'){
      io.emit('game', game)
      io.emit('gameEnd', '스켈레톤 승리')
    }
    //뽑은게 보물상자면  카운트증가
    else if(pickedCard == '보물상자'){
      goldCount++

      //탐험대 승리조건 체크
      if(goldCount == numberOfPlayer){
        io.emit('game', game)
        io.emit('gameEnd', '탐험대 승리')
      }
    }
    game.turn++
    game.round = parseInt(game.turn/numberOfPlayer)
    game.pickedCards.push(pickedCard) 

    if (game.turn%numberOfPlayer==0){
      console.log(game.round+1,' 라운드 입니다.');
      
      roundInit()
    }
    if (game.turn >= numberOfPlayer * 4 - 1) {
      io.emit('game', game)
      io.emit('gameEnd', '스켈레톤 승리')
    }
    io.emit('game', game)
  })

  socket.on('disconnect', () => {
    console.log("SOCKETIO disconnect EVENT: ", socket.id, " client disconnect");
    userList.splice(userList.findIndex(x=>x.id==socket.id), 1);
    io.emit('userList', userList)
  })
})

server.listen(port, () => {
  console.log('Server On !');
});

//원래 쓰던 소팅보다 조금더 신뢰성이 높다고 함
//https://medium.com/@kimploo/%EB%B0%94%EB%9E%8C%EC%A7%81%ED%95%9C-%EB%AC%B4%EC%9E%91%EC%9C%84-%EB%B0%B0%EC%97%B4-fitting-random-array-in-javascript-882d69d49e23
//링크참조
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
}

//라운드 넘어 갈때마다 플레이어들의 남은 카드 회수해서 섞고 무작위로 재분배
function roundInit(){
  let tempDeck = game.users.flatMap(x => x.deck)
  shuffleArray(tempDeck)
  game.users.map(x=>x.deck=tempDeck.splice(0, 5-game.round))
}