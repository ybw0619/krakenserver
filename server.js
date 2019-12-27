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
userList=[]
memberCount = 0
readyCount = 0
goldCount = 0
nowTurnId = ''
round = 1
nowTurn = 1

io.on('connection', (socket) => {
  console.log("SOCKETIO Connect EVENT: ", socket.id, " client Connect");
  io.emit('broadcast', `${socket.id}님이 참여했음`);
  userList.push({
    id: socket.id
  })
  io.emit('userList', userList)


  socket.on('gameStart', ()=>{
    console.log('게임시작');

    //초기화
    round = 1
    nowTurn = 1

    goldcount = 0

    numberOfPlayer = userList.length
    //크라켄 (무조건 1장)
    craken = ['크라켄']
    //보물상자 (플레이어 수 만큼) 
    gold = Array(numberOfPlayer).fill('보물상자')
    //빈상자 (4n-1만큼)
    empty = Array(4 * numberOfPlayer - 1).fill('빈상자')

    //플레이어수 4인 이하 유령1명고정
    //5~6인 1~2, 7~8인 2~3
    if(numberOfPlayer >= 5){
      ghostcount = Math.ceil(numberOfPlayer/2)-2 + parseInt(Math.random()*10)%2
      ghost = Array(ghostcount).fill("유령")
    } else {
      ghost = ["유령"]
    }
    //유령수 확정후 나머지 선원
    pirate = Array(numberOfPlayer-ghost.length).fill("해적")
    //유령,해적 역할 합치기
    role = [...ghost, ...pirate]

    //크라켄 + 보물상자 + 빈상자 한 덱으로 합치고
    deck = [...craken, ...gold, ...empty]

    //덱을 섞어 섞어
    deck.sort(() => Math.random() - Math.random())
    //역할배정 섞기
    role.sort(() => Math.random() - Math.random())

    //플레이어는 최대 8명
    player = [[],[],[],[],[],[],[],[]]

    //섞은 덱에서 다섯장씩 순서대로 분배분배
    player = player.map(x => deck.splice(0, 5))

    for (let i = 0; i < numberOfPlayer; i++) {
      io.to(userList[i].id).emit('role', role[i])
      io.to(userList[i].id).emit('deck', player[i])
    }
    
    for (let i = 0; i < numberOfPlayer; i++) {
      io.emit('others', {user: userList[i].id, deckLength: player[i].length})
      io.emit('turn-start', {id: userList[0].id, turn: nowTurn})
    }
    
  })

  socket.on('turn-select', (turn) => {
    nowTurnId = turn.id
    let nowSelect = turn.selectCard //선택한 카드의 인덱스

    userList.forEach((user,i) => {
      if (user.id === turn.id) {
        si = i
      }
    })

    //카드 체크 -오준용
    cardCheck(turn,si);

    player[si].splice(turn.selectCard, 1)
    
    nowTurn = nowTurn + 1

    console.log('nowTurn',nowTurn)

    for (let i = 0; i < numberOfPlayer; i++) {
      io.emit('turn-start', {id: nowTurnId, turn: nowTurn})
      io.emit('turn-end', {user: turn.id, deckLength: player[i].length, select: turn.selectCard})
    }
  })

  socket.on('round-end', (turn) => {
    nowTurn = 1
    round = round + 1

    let temp = []

    player.forEach(deck => {
      deck.forEach(card => {
        temp.push(card)
      })
    })

    // 라운드 끝났으니까 다시 섞어섞어
    temp.sort(() => Math.random() - Math.random())

    //플레이어는 최대 8명
    player = [[],[],[],[],[],[],[],[]]

    //섞은 덱에서 다섯장씩 순서대로 분배분배
    player = player.map(x => temp.splice(0, 5 - (round - 1)))

    for (let i = 0; i < numberOfPlayer; i++) {
      io.to(userList[i].id).emit('deck', player[i])
    }
    for (let i = 0; i < numberOfPlayer; i++) {
      io.emit('others', {user: userList[i].id, deckLength: player[i].length})
    }
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

//선택한 카드 확인 함수
cardCheck = (turn,playerIndex) => {
  //크라켄 선택 ==> 유령 승리
  if(player[playerIndex][turn.selectCard]  === "크라켄") {
    console.log("크라켄 등장");
  }

  //보물상자 선택
  else if(player[playerIndex][turn.selectCard]  === "보물상자") {
    console.log("보물상자 등장");
    goldCount++;
    console.log("찾은 보물상자 수 : ",goldCount, "총 보물상자 수 : ", numberOfPlayer);
    //보물상자 수 == 플레이어 수 (게임종료, 해적 승리)
    if(goldCount >= numberOfPlayer){
      console.log("보물상자 모두 찾음 해적 승리");
    }
  }
  //빈상자 선택
  else if(player[playerIndex][turn.selectCard]  === "빈상자") {
    console.log("빈상자 입니다");
  }

  //이상한거 선택시
  else {
    console.log("==== CARD SELECT ERROR ====")
  }
}

