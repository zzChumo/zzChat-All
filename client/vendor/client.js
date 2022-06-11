// initialize markdown engine
var markdownOptions = {
	html: false,
	xhtmlOut: false,
	breaks: true,
	langPrefix: '',
	linkify: true,
	linkTarget: '_blank" rel="noreferrer',
	typographer:  true,
	quotes: `""''`,

	doHighlight: true,
	highlight: function (str, lang) {
		if (!markdownOptions.doHighlight || !window.hljs) { return ''; }

		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(lang, str).value;
			} catch (__) {}
		}

		try {
			return hljs.highlightAuto(str).value;
		} catch (__) {}

		return '';
	}
};

var md = new Remarkable('full', markdownOptions);

// image handler
var allowImages = true;
var allowSend = true;
var showHead = true;
var autoLogin = false;
var onLineNum = 0;
var defaultHeadPic = 'https://xq.kzw.ink/imgs/tx.png';
var addOld = false;
var head = defaultHeadPic
var dp = null
var live = false
var imgHostWhitelist = [
	'i.imgur.com',
	'imgur.com',
];

function getDomain(link) {
	var a = document.createElement('a');
	a.href = link;
	return a.hostname;
}

function isWhiteListed(link) {
	return imgHostWhitelist.indexOf(getDomain(link)) !== -1;
}

md.renderer.rules.image = function (tokens, idx, options) {
	var src = Remarkable.utils.escapeHtml(tokens[idx].src);

	if (allowImages) {
		var imgSrc = ' src="' + Remarkable.utils.escapeHtml(tokens[idx].src) + '"';
		var title = tokens[idx].title ? (' title="' + Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(tokens[idx].title)) + '"') : '';
		var alt = ' alt="' + (tokens[idx].alt ? Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(Remarkable.utils.unescapeMd(tokens[idx].alt))) : '') + '"';
		var suffix = options.xhtmlOut ? ' /' : '';
		var scrollOnload = isAtBottom() ? ' onload="window.scrollTo(0, document.body.scrollHeight)"' : '';
		return '<a href="' + src + '" target="_blank" rel="noreferrer"><img' + scrollOnload + imgSrc + alt + title + suffix + '></a>';
	}

  return '<a href="' + src + '" target="_blank" rel="noreferrer">' + Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(src)) + '</a>';
};

md.renderer.rules.link_open = function (tokens, idx, options) {
	var title = tokens[idx].title ? (' title="' + Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(tokens[idx].title)) + '"') : '';
  var target = options.linkTarget ? (' target="' + options.linkTarget + '"') : '';
  return '<a rel="noreferrer" onclick="return verifyLink(this)" href="' + Remarkable.utils.escapeHtml(tokens[idx].href) + '"' + title + target + '>';
};

md.renderer.rules.text = function(tokens, idx) {
	tokens[idx].content = Remarkable.utils.escapeHtml(tokens[idx].content);

	if (tokens[idx].content.indexOf('?') !== -1) {
		tokens[idx].content = tokens[idx].content.replace(/(^|\s)(\?)\S+?(?=[,.!?:)]?\s|$)/gm, function(match) {
			var channelLink = Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(match.trim()));
			var whiteSpace = '';
			if (match[0] !== '?') {
				whiteSpace = match[0];
			}
			return whiteSpace + '<a href="' + channelLink + '" target="_blank">' + channelLink + '</a>';
		});
	}

  return tokens[idx].content;
};

md.use(remarkableKatex);

function verifyLink(link) {
	var linkHref = Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(link.href));
	if (linkHref !== link.innerHTML) {
		return confirm('警告，请确认这是你想去的地方:' + linkHref);
	}

	return true;
}

var verifyNickname = function (nick) {
	console.log(/^[\u4e00-\u9fa5_a-zA-Z0-9]{1,24}$/.test(nick))
	return /^[\u4e00-\u9fa5_a-zA-Z0-9]{1,24}$/.test(nick);
	//return true
}

var homeText = "# XClient\n##### \n-----\n"+
"欢迎来到线圈聊天工具——XClient\n这是一个极简、小型的网页在线聊天工具，专为Hack.Chat适配，基于XChat的客户端构建。\n"+
"您可以访问这个随机生成的聊天室（大概率只有您自己）：  ?" +Math.random().toString(36).substr(2, 8)+
"\n-----\n[您可以点击这里访问我们的主页](https://www.zzchat.cf)\n"+
"您可以通过修改ws/wss地址来指定需要连接的Hack.Chat系聊天室。\n"+
"XClient基于XChat，开源网址：https://gitee.com/liguiyu102210/xchat  \n"+
"XChat改编自hackchat开源项目，开源网址：https://github.com/hack-chat/  \n"+
"**如需商用该项目，请注明上述两个项目个项目的开源网址、开发者（Gitee@liguiyu102210和bilibili@智障初墨）和该项目的原名。** \n-----\n"+
"©Copyright 2022 XQ Team,GS Team";

function $$(query) {
	return document.querySelector(query);
}

function localStorageGet(key) {
	try {
		return window.localStorage[key]
	} catch (e) { }
}

function localStorageSet(key, val) {
	try {
		window.localStorage[key] = val
	} catch (e) { }
}

var ws;
var myNick = localStorageGet('my-nick') || '';
var myChannel = window.location.search.replace(/^\?/, '');
var lastSent = [""];
var lastSentPos = 0;
var video_url = null
var userInfo = null
var cap_img = null

/** Notification switch and local storage behavior **/
var notifySwitch = document.getElementById("notify-switch")
var notifySetting = localStorageGet("notify-api")
var notifyPermissionExplained = 0; // 1 = granted msg shown, -1 = denied message shown



// Inital request for notifications permission
function RequestNotifyPermission() {
	try {
		var notifyPromise = Notification.requestPermission();
		if (notifyPromise) {
			notifyPromise.then(function (result) {
				console.log("XChat notification permission: " + result);
				if (result === "granted") {
					if (notifyPermissionExplained === 0) {
						pushMessage({
							cmd: "chat",
							nick: "*",
							text: "通知权限授予",
							time: null
						});
						notifyPermissionExplained = 1;
					}
					return false;
				} else {
					if (notifyPermissionExplained === 0) {
						pushMessage({
							cmd: "chat",
							nick: "*",
							text: "通知权限被拒绝，如果有人@提到你，你不会收到通知。",
							time: null
						});
						notifyPermissionExplained = -1;
					}
					return true;
				}
			});
		}
	} catch (error) {
		pushMessage({
			cmd: "chat",
			nick: "*",
			text: "无法创建通知",
			time: null
		});
		console.error("An error occured trying to request notification permissions. This browser might not support desktop notifications.\nDetails:")
		console.error(error)
		return false;
	}
}

// Update localStorage with value of checkbox
notifySwitch.addEventListener('change', (event) => {
	if (event.target.checked) {
		RequestNotifyPermission();
	}
	localStorageSet("notify-api", notifySwitch.checked)
})
// Check if localStorage value is set, defaults to OFF
if (notifySetting === null) {
	localStorageSet("notify-api", "false")
	notifySwitch.checked = false
}
// Configure notifySwitch checkbox element
if (notifySetting === "true" || notifySetting === true) {
	notifySwitch.checked = true
} else if (notifySetting === "false" || notifySetting === false) {
	notifySwitch.checked = false
}

/** Sound switch and local storage behavior **/
var soundSwitch = document.getElementById("sound-switch")
var notifySetting = localStorageGet("notify-sound")

// Update localStorage with value of checkbox
soundSwitch.addEventListener('change', (event) => {
	localStorageSet("notify-sound", soundSwitch.checked)
})
// Check if localStorage value is set, defaults to OFF
if (notifySetting === null) {
	localStorageSet("notify-sound", "false")
	soundSwitch.checked = false
}
// Configure soundSwitch checkbox element
if (notifySetting === "true" || notifySetting === true) {
	soundSwitch.checked = true
} else if (notifySetting === "false" || notifySetting === false) {
	soundSwitch.checked = false
}

// Create a new notification after checking if permission has been granted
function spawnNotification(title, body) {
	// Let's check if the browser supports notifications
	if (!("Notification" in window)) {
		console.error("This browser does not support desktop notification");
	} else if (Notification.permission === "granted") { // Check if notification permissions are already given
		// If it's okay let's create a notification
		var options = {
			body: body,
			icon: "imgs/96x96.png"
		};
		var n = new Notification(title, options);
	}
	// Otherwise, we need to ask the user for permission
	else if (Notification.permission !== "denied") {
		if (RequestNotifyPermission()) {
			var options = {
				body: body,
				icon: "imgs/96x96.png"
			};
			var n = new Notification(title, options);
		}
	} else if (Notification.permission == "denied") {
		// At last, if the user has denied notifications, and you
		// want to be respectful, there is no need to bother them any more.
	}
}

function notify(args) {
	// Spawn notification if enabled
	if (notifySwitch.checked) {
		spawnNotification("?" + myChannel + "  —  " + args.nick, args.text)
	}

	// Play sound if enabled
	if (soundSwitch.checked) {
		var soundPromise = document.getElementById("notify-sound").play();
		if (soundPromise) {
			soundPromise.catch(function (error) {
				console.error("Problem playing sound:\n" + error);
			});
		}
	}
}

function localStorageGet(key) {
	try {
		return window.localStorage[key]
	} catch (e) { }
}

function localStorageSet(key, val) {
	try {
		window.localStorage[key] = val
	} catch (e) { }
}

function join(channel) {
	// for local installs
	var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
	// if you changed the port during the server config, change 'wsPath'
	// to the new port (example: ':8080')
	// if you are reverse proxying, change 'wsPath' to the new location
	// (example: '/chat-ws')
	var wsPath = location.protocol === 'https:' ? '/ws' : ':6060';
	var wasConnected = false;

	ws = new WebSocket("ws://localhost:6060/chat-ws");

	ws.onopen = function () {
		var shouldConnect = true;
		if (!wasConnected) {
			if(localStorageGet('auto-login') == 'true' && localStorageGet('my-nick')) {
				myNick = localStorageGet('my-nick')
			} else {
				if (location.hash) {
					myNick = location.hash.substr(1);
				} else {
					var newNick = prompt('昵称:', myNick);
					if (newNick !== null) {
						myNick = newNick;
					} else {
						// The user cancelled the prompt in some manner
						shouldConnect = false;
					}
				}
			}
			
		}
		localStorageSet('allow-imgur', true);
		allowImages = true;
		
		//send({ cmd: 'warn', text:'--以上内容为历史记录--'});
		if (myNick && shouldConnect) {
			localStorageSet('my-nick', myNick);
			
			send({ cmd: 'join', channel: channel, nick: myNick });
			pushMessage({ nick: '*', text: "在线用户: " + a_nicks.join(", ") })
		}
		var h5_mynick = document.querySelector("#mynick")
		h5_mynick.innerHTML = '当前昵称：'+myNick.split('#')[0]
		
		

		wasConnected = true;
	}

	ws.onclose = function () {
		if (wasConnected) {
			pushMessage({ nick: '!', text: "您已经断开了与服务器的连接，原因包括且不限于服务器炸了、网络问题和智障初墨脑子抽风。请刷新页面。" });
		}

		window.setTimeout(function () {
			join(channel);
		}, 2000);
	}

	ws.onmessage = function (message) {
		var args = JSON.parse(message.data);
		var cmd = args.cmd;
		var command = COMMANDS[cmd];
		command.call(null, args);
	}
}
nicks = null
var COMMANDS = {
	list: function (args) {
		args.tag = 'old'
		pushMessage(args);
		console.log(args)
		if(args.text.length == 0) {
			pushMessage({ nick: '*', text: "----没有历史记录----"})
		} else {
			pushMessage({ nick: '*', text: "----以上为历史记录----"})
		}
		var a_nicks = []
		for (var i=0; i<nicks.length; i+=1) {
			if (!(nicks[i].indexOf('挂机') > 0)) {
				a_nicks.push(nicks[i])
			}
		}
		pushMessage({ nick: '*', text: "在线用户: " + a_nicks.join(", ") })
		window.scrollTo(0, document.body.scrollHeight);
		pushMessage({ nick: '*', text: cap_img})
	},
	chat: function (args) {
		console.log(args)
		if (ignoredUsers.indexOf(args.nick) >= 0) {
			return;
		}
		head = args.head
		pushMessage(args);
	},
	kill: function (args) {
		console.log(mynick)
		if(args.nick==myNick.split('#')[0]) {
			localStorageSet("killed", 1)
		}
		pushMessage({ nick: '*', text: "已踢出"+args.nick});
	},
	unkill: function (args) {
		console.log(args)
		if(args.nick==myNick.split('#')[0]) {
			localStorageSet("killed", 0)
		}
		pushMessage({ nick: '*', text: "已取消踢出"+args.nick});
	},
	info: function (args) {
		args.nick = '*';
		pushMessage(args);
	},
	shout: function (args) {
		alert(args.text)
	},

	warn: function (args) {
		args.nick = '!';
		pushMessage(args);
		if (args.text == '该昵称已被其他用户预留') {
			allowSend = false
		}
	},

	onlineSet: function (args) {
		nicks = args.nicks;
		console.log(nicks)
		usersClear();

		nicks.forEach(function (nick) {
			userAdd(nick);
		});
		
		pushMessage({ nick: '*', text: "在线的用户: " + nicks.join(", ") })
		
	},

	onlineAdd: function (args) {
		var nick = args.nick;

		userAdd(nick);

		if ($$('#joined-left').checked) {
			/*
			if (nick.indexOf('｜挂机') >0) {
				pushMessage({ nick: '*', text: nick + " 进入挂机状态" });
			} else {
				pushMessage({ nick: '*', text: nick + " 加入了聊天室" });
			}
			*/
			pushMessage({ nick: '*', text: nick + " 加入了聊天室" });
		}
	},

	onlineRemove: function (args) {
		var nick = args.nick;

		userRemove(nick);

		if ($$('#joined-left').checked) {
			pushMessage({ nick: '*', text: nick + " 离开了聊天室" });
		}
	},
	onafkAdd: function (args) {
		
		console.log(args.nick)
		var nick = args.nick;
		userRemove(nick.split('｜')[0].split(']')[1])
		userRemove(nick)
		userAdd(nick);
		if ($$('#joined-left').checked) {
			pushMessage({ nick: '*', text: nick + " 进入挂机状态" });
		}
	},
	onafkRemove: function (args) {
		console.log('onafkRemove')
		var nick = args.nick;
		console.log(nick)
		userRemove(nick);
		if ($$('#joined-left').checked) {
			pushMessage({ nick: '*', text: nick + " 退出挂机状态" });
		}
	},
	changenick: function (args) {
		var h5_mynick = document.querySelector("#mynick")
		h5_mynick.innerHTML = '当前昵称：'+args.nick.split('#')[0]
	},
	video: function(args) {
		video_url = args.url
		console.log('video url:', video_url)
		if (video_url == 'none') {
			alert('没有视频可以播放，请联系管理员添加视频')
			return false;
		}
		var base = btoa(encodeURI(video_url))
		console.log(base)
		dp = new DPlayer({
			container: document.getElementById('player'),
			screenshot: true,
			mutex: false,
			live: live,
			playbackSpeed: [1],
			video: {
				url: ''
			},
			danmaku: {
				id: base,
				//id: video_url.replace('/', '').replace(':', '').replace('&', '').replace('?','').replace('.','').replace('=', ''),
				//id: '!@#$%^#$%^&&*()fjksahjfkdlahu<>?..,/.\\||````',
				api: 'https://dplayer.moerats.com/',
				user:myNick,

			},
		});
		dp.on('seeked', function () {
			console.log(dp.video.currentTime)
			ws.send(JSON.stringify({ cmd: 'send_seeked', vtime:dp.video.currentTime, nick:myNick.split('#')[0]}));
		});
		dp.on('pause', function () {
			console.log(dp.video.currentTime)
			ws.send(JSON.stringify({ cmd: 'send_seeked', vtime:-10, nick:myNick.split('#')[0]}));
		});
		dp.on('play', function () {
			console.log(dp.video.currentTime)
			ws.send(JSON.stringify({ cmd: 'send_seeked', vtime:-20, nick:myNick.split('#')[0]}));
		});
		layer.open({
			type: 1,
			title: '一起看视频吧',
			shadeClose: true,
			shade: false,
			maxmin: true,
			area: ['80%', '80%'],
			content: $('#player'),
			end: function () {
				dp.volume(0, true, true);
				ws.send(JSON.stringify({cmd:'closed_video'}));
			}
		});
		dp.switchVideo({url: video_url});
		dp.play()
	},
	/*
	userInfo: function (args) {
		console.log(args)
		userInfo = args.content
		live = true
		if(userInfo.uType=='mod' || userInfo.uType=='admin') {
			live=false
		}
	},
	*/
	send_seeked: function (args) {
		if (dp.video.paused) {
			ws.send(JSON.stringify({ cmd: 'invate_seeked', vtime:-10, nick:args.nick}));
		}
		ws.send(JSON.stringify({ cmd: 'invate_seeked', vtime:dp.video.currentTime, nick:args.nick}));
	},
	set_seeked: function(args) {
		if (args.nick != myNick.split('#')[0]) {
			if (args.vtime == -10) {
				dp.pause()
			} else if (args.vtime == -20) {
				dp.play()
			} else {
				dp.seek(args.vtime)
			}
			
		}
		
	},
	cap: function(args) {
		console.log(args.text)
		cap_img = args.text.replace('files','https://xq.kzw.ink/files')
	}

}

function pushMessage(args) {
	// Message container
	var messageEl = document.createElement('div');
	
	if (!args.tag) {
		if (typeof (myNick) === 'string' && (args.text.match(new RegExp('@' + myNick.split('#')[0] + '\\b', "gi")) ||((args.type === "whisper" || args.type === "invite") && args.from))) {
			notify(args);
		}
	}
	

	messageEl.classList.add('message');

	if (verifyNickname(myNick) && args.nick == myNick) {
		messageEl.classList.add('me');
	} else if (args.nick == '!') {
		messageEl.classList.add('warn');
	} else if (args.nick == '*') {
		messageEl.classList.add('info');
	} else if (args.admin) {
		messageEl.classList.add('admin');
	} else if (args.mod) {
		messageEl.classList.add('mod');
	} else if(args.tag == 'old') {
		messageEl.classList.add('me');

	}

	// Nickname
	var nickSpanEl = document.createElement('span');
	nickSpanEl.classList.add('nick');
	messageEl.appendChild(nickSpanEl);

	if (args.trip) {
		var tripEl = document.createElement('span');
		tripEl.textContent = args.trip + " ";
		tripEl.classList.add('trip');
		nickSpanEl.appendChild(tripEl);
	}

	if (args.nick) {
		var nickLinkEl = document.createElement('a');
		nickLinkEl.textContent = args.nick;

		var imgEl = document.createElement('img')
		//下面注释代码已经弃用，原因是可以在发送的json中提取自己的头像地址
		/*
		if (verifyNickname(myNick) && args.nick == myNick) {
			imgEl.src = localStorageGet('head')
		} else {
			imgEl.src = head
		}
		*/
		imgEl.src = head
		imgEl.style.height = '25px'
		imgEl.style.width = '25px'
		imgEl.style.marginRight = '0.5rem'
		imgEl.style.verticalAlign = 'top'
		imgEl.style.borderRadius = '50%'
		imgEl.style.display = 'none'
		/*
		nickLinkEl.onclick = function () {
			insertAtCursor("@" + args.nick + " ");
			$$('#chatinput').focus();
		}
		*/
		//感谢cc作出的贡献，以下内容来自cc
		nickLinkEl.onclick = function () {
			// Reply to a whisper or info is meaningless
			if ( args.type == 'whisper' || args.nick == '*' || args.nick == '!' ) {
				insertAtCursor( args.text );
				$$('#chat-input').focus();
				return;
			} else {
				
				insertAtCursor( '@' + args.nick + ' ' );
				$$('#chatinput').focus();
				return;
			}
			
		}
		// Mention someone when right-clicking
		nickLinkEl.oncontextmenu = function ( e ) {
			
			e.preventDefault();
			let replyText = '';
			let originalText = args.text;
			let overlongText = false;
			
			// Cut overlong text
			if ( originalText.length > 350 ) {
				replyText = originalText.slice(0, 350);
				overlongText = true;
			}

			// Add nickname
			if ( args.trip ) {
				replyText = '>' + args.trip + ' ' + args.nick + '：\n';
			} else {
				replyText = '>' + args.nick + '：\n';
			}

			// Split text by line
			originalText = originalText.split('\n');

			// Cut overlong lines
			if ( originalText.length >= 8 ) {
				originalText = originalText.slice(0, 8);
				overlongText = true;
			}

			for ( let replyLine of originalText ) {
				// Cut third replied text
				if ( !replyLine.startsWith('>>')) {
					replyText += '>' + replyLine + '\n';
				}
			}

			// Add elipsis if text is cutted
			if ( overlongText ) {
				replyText += '>……\n';
			}
			replyText += '\n';


			// Add mention when reply to others
			if ( args.nick != myNick ) {
				replyText += '@' + args.nick + ' ';
			}

			// Insert reply text
			replyText += $$('#chatinput').value;

			$$('#chatinput').value = '';
			insertAtCursor( replyText );
			$$('#chatinput').focus();
		}

		// 以上内容来自cc

		var date = new Date(args.time || Date.now());
		nickLinkEl.title = date.toLocaleString();
		if(!(args.nick == '*' || args.nick == '!')) {
			if(showHead) {
				nickSpanEl.appendChild(imgEl);
			}
			
		}
		nickSpanEl.appendChild(nickLinkEl);
	}

	// Text
	var textEl = document.createElement('p');
	textEl.classList.add('text');
	if(!args.tag) {
		textEl.innerHTML = md.render(args.text);
	}else {
		var html = ''
		args.text.forEach(v=> {
			var content = md.render(v.content)
			if (v.head) {
				head_pic = v.head
			} else {
				head_pic = defaultHeadPic
			}
			if (showHead) {
				html = `<div class="message"><span class="nick"><img src="${head_pic}" style="height: 25px; width: 25px; margin-right: 0.5rem; vertical-align: top; border-top-left-radius: 50%; border-top-right-radius: 50%; border-bottom-right-radius: 50%; border-bottom-left-radius: 50%;"><a title="${v.time}">${v.nick}</a></span><p class="text"><p style="margin-left: 2rem;">${content}</p></p></div>`+html
			} else {
				html = `<div class="message"><span class="nick"><a title="${v.time}">${v.nick}</a></span><p class="text"><p>${content}</p></p></div>`+html
			}
			
		})
		textEl.innerHTML = html
	}

	messageEl.appendChild(textEl);
	//这种方法已弃用，原因是可能导致class中其他值出错
	/*
	var selector = document.querySelector("#font-selector")
	var index = selector.selectedIndex
    var value = selector.options[index].value
	messageEl.className = '';
	messageEl.classList.add('message')
	messageEl.classList.add(value)
	*/
	// Scroll to bottom
	var atBottom = isAtBottom();
	$$('#messages').appendChild(messageEl);
	if (atBottom) {
		window.scrollTo(0, document.body.scrollHeight);
	}

	unread += 1;
	updateTitle();
}

function insertAtCursor(text) {
	var input = $$('#chatinput');
	var start = input.selectionStart || 0;
	var before = input.value.substr(0, start);
	var after = input.value.substr(start);

	before += text;
	input.value = before + after;
	input.selectionStart = input.selectionEnd = before.length;

	updateInputSize();
}

function send(data) {
	if (ws && ws.readyState == ws.OPEN) {
		console.log(data)
		if(addOld) {
			data.show = 1;
		} else {
			data.show = 0;
		}
		if (localStorageGet('head')) {
			data.head = localStorageGet('head')
		} else {
			data.head = defaultHeadPic
		}
		if(localStorageGet('killed') != 1) {
			if(allowSend) {
				//页面命令
				if (data.text) {
					if (data.text.startsWith('/')) {
						data.text = data.text.substr(1);
						var [cmd,args] = data.text.split(' ')

						//设置共享视频地址
						if (cmd == 'video') {
							console.log(args)
							ws.send(JSON.stringify({cmd:'set_video', url: args}));
							return false;
						}

						//完成后确认没有命令则添加斜杠
						data.text = '/'+data.text;
					}
					
				}
				
				ws.send(JSON.stringify(data));
			} else {
				pushMessage({nick:'*', text:'当前昵称已被预留，请更换昵称'})
			}
		} else {
			alert('您已被禁言')
		}
		
	}
}

var windowActive = true;
var unread = 0;

window.onfocus = function () {
	windowActive = true;

	updateTitle();
}

window.onblur = function () {
	windowActive = false;
}

window.onscroll = function () {
	if (isAtBottom()) {
		updateTitle();
	}
}

function isAtBottom() {
	return (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 1);
}

function updateTitle() {
	if (windowActive && isAtBottom()) {
		unread = 0;
	}

	var title;
	if (myChannel) {
		title = "?" + myChannel;
	} else {
		title = "XChat";
	}

	if (unread > 0) {
		title = '(' + unread + ') ' + title;
	}

	document.title = title;
}

$$('#footer').onclick = function () {
	$$('#chatinput').focus();
}

$$('#chatinput').onkeydown = function (e) {
	if (e.keyCode == 13 /* ENTER */ && !e.shiftKey) {
		e.preventDefault();

		// Submit message
		if (e.target.value != '') {
			var text = e.target.value;
			e.target.value = '';

			send({ cmd: 'chat', text: text });

			lastSent[0] = text;
			lastSent.unshift("");
			lastSentPos = 0;

			updateInputSize();
		}
	} else if (e.keyCode == 38 /* UP */) {
		// Restore previous sent messages
		if (e.target.selectionStart === 0 && lastSentPos < lastSent.length - 1) {
			e.preventDefault();

			if (lastSentPos == 0) {
				lastSent[0] = e.target.value;
			}

			lastSentPos += 1;
			e.target.value = lastSent[lastSentPos];
			e.target.selectionStart = e.target.selectionEnd = e.target.value.length;

			updateInputSize();
		}
	} else if (e.keyCode == 40 /* DOWN */) {
		if (e.target.selectionStart === e.target.value.length && lastSentPos > 0) {
			e.preventDefault();

			lastSentPos -= 1;
			e.target.value = lastSent[lastSentPos];
			e.target.selectionStart = e.target.selectionEnd = 0;

			updateInputSize();
		}
	} else if (e.keyCode == 27 /* ESC */) {
		e.preventDefault();

		// Clear input field
		e.target.value = "";
		lastSentPos = 0;
		lastSent[lastSentPos] = "";

		updateInputSize();
	} else if (e.keyCode == 9 /* TAB */) {
		// Tab complete nicknames starting with @

		if (e.ctrlKey) {
			// Skip autocompletion and tab insertion if user is pressing ctrl
			// ctrl-tab is used by browsers to cycle through tabs
			return;
		}
		e.preventDefault();

		var pos = e.target.selectionStart || 0;
		var text = e.target.value;
		var index = text.lastIndexOf('@', pos);

		var autocompletedNick = false;

		if (index >= 0) {
			var stub = text.substring(index + 1, pos).toLowerCase();
			// Search for nick beginning with stub
			var nicks = onlineUsers.filter(function (nick) {
				return nick.toLowerCase().indexOf(stub) == 0
			});

			if (nicks.length > 0) {
				autocompletedNick = true;
				if (nicks.length == 1) {
					insertAtCursor(nicks[0].substr(stub.length) + " ");
				}
			}
		}

		// Since we did not insert a nick, we insert a tab character
		if (!autocompletedNick) {
			insertAtCursor('\t');
		}
	}
}

function updateInputSize() {
	var atBottom = isAtBottom();

	var input = $$('#chatinput');
	input.style.height = 0;
	input.style.height = input.scrollHeight + 'px';
	document.body.style.marginBottom = $$('#footer').offsetHeight + 'px';

	if (atBottom) {
		window.scrollTo(0, document.body.scrollHeight);
	}
}

$$('#chatinput').oninput = function () {
	updateInputSize();
}

updateInputSize();

/* sidebar */

$$('#sidebar').onmouseenter = $$('#sidebar').ontouchstart = function (e) {
	$$('#sidebar-content').classList.remove('hidden');
	$$('#sidebar').classList.add('expand');
	e.stopPropagation();
}

$$('#sidebar').onmouseleave = document.ontouchstart = function (event) {
	var e = event.toElement || event.relatedTarget;
	try {
		if (e.parentNode == this || e == this) {
	     return;
	  }
	} catch (e) { return; }

	if (!$$('#pin-sidebar').checked) {
		$$('#sidebar-content').classList.add('hidden');
		$$('#sidebar').classList.remove('expand');
	}
}

$$('#clear-messages').onclick = function () {
	// Delete children elements
	var messages = $$('#messages');
	messages.innerHTML = '';
}

$$('#set-bgimage').onclick = function () {
	if(localStorageGet('bgurl') != null) {
		var bgurl = prompt('背景图片地址:', localStorageGet('bgurl'));
	} else {
		var bgurl = prompt('背景图片地址:');
	}
	if(bgurl == '') {
		alert('地址不能为空')
	} else if (bgurl) {
		if($$('.bg-img')) {
			$$('#body').removeChild($$('.bg-img'))
		}
		$$('#scheme-link').href = "schemes/clear.css";
		console.log($$('#body').style)
		var bgdiv = document.createElement('div')
		console.log(bgdiv)
		bgdiv.className = 'bg-img'
		//$$('#body').create(`<div class="bg-img" background="${bgurl}"></div>`)
		bgdiv.style.backgroundImage = `url(${bgurl.replace('"')})`
		$$('#body').appendChild(bgdiv)
		var bg_selector = document.querySelector("#scheme-selector")
		bg_selector.selectedIndex = 34
		//$$('#body').style.background = ``
		localStorageSet('bgurl', bgurl);
	}
}

$$('#set-head').onclick = function () {
	if(localStorageGet('head') != null) {
		var pic = prompt('头像地址:', localStorageGet('head'));
	} else {
		var pic = prompt('头像地址:');
	}
	if(pic == '') {
		alert('地址不能为空')
		head = defaultHeadPic
		localStorageSet('head', '');
		
	} else if (pic) {
		head = pic
		localStorageSet('head', head);
	}
}

$$('#clear-nick').onclick = function () {
	localStorageSet("my-nick", '')
	localStorageSet('auto-login', 'false')
	pushMessage({
		cmd: "chat",
		nick: "*",
		text: "已清除您的登录信息！",
		time: null
	});
}

$$("#lay-video").onclick = function() {
	ws.send(JSON.stringify({ cmd: 'get_video'}));
}

// Restore settings from localStorage

if (localStorageGet('pin-sidebar') == 'true') {
	$$('#pin-sidebar').checked = true;
	$$('#sidebar-content').classList.remove('hidden');
}

if (localStorageGet('joined-left') == 'false') {
	$$('#joined-left').checked = false;
}

if (localStorageGet('parse-latex') == 'false') {
	$$('#parse-latex').checked = false;
	md.inline.ruler.disable([ 'katex' ]);
	md.block.ruler.disable([ 'katex' ]);
}

$$('#pin-sidebar').onchange = function (e) {
	localStorageSet('pin-sidebar', !!e.target.checked);
}

$$('#joined-left').onchange = function (e) {
	localStorageSet('joined-left', !!e.target.checked);
}

$$('#parse-latex').onchange = function (e) {
	var enabled = !!e.target.checked;
	localStorageSet('parse-latex', enabled);
	if (enabled) {
		md.inline.ruler.enable([ 'katex' ]);
		md.block.ruler.enable([ 'katex' ]);
	} else {
		md.inline.ruler.disable([ 'katex' ]);
		md.block.ruler.disable([ 'katex' ]);
	}
}

if (localStorageGet('syntax-highlight') == 'false') {
	$$('#syntax-highlight').checked = false;
	markdownOptions.doHighlight = false;
}

$$('#syntax-highlight').onchange = function (e) {
	var enabled = !!e.target.checked;
	localStorageSet('syntax-highlight', enabled);
	markdownOptions.doHighlight = enabled;
}

if (localStorageGet('allow-imgur') == 'false') {
	$$('#allow-imgur').checked = false;
	allowImages = false;
}

$$('#allow-imgur').onchange = function (e) {
	var enabled = !!e.target.checked;
	localStorageSet('allow-imgur', enabled);
	allowImages = enabled;
}

if (localStorageGet('add-old') == 'false') {
	$$('#add-old').checked = false;
	addOld = false;
}

$$('#add-old').onchange = function (e) {
	var enabled = !!e.target.checked;
	localStorageSet('add-old', enabled);
	addOld = enabled;
}

if (localStorageGet('auto-login') == 'true') {
	$$('#auto-login').checked = true;
	autoLogin = true;
}

$$('#auto-login').onchange = function (e) {
	var enabled = !!e.target.checked;
	localStorageSet('auto-login', enabled);
	autoLogin = enabled;
}

// User list
var onlineUsers = [];
var ignoredUsers = [];

function userAdd(nick) {
	var user = document.createElement('a');
	user.textContent = nick;

	user.onclick = function (e) {
		userInvite(nick)
	}

	var userLi = document.createElement('li');
	userLi.appendChild(user);
	$$('#users').appendChild(userLi);
	onlineUsers.push(nick);
}

function userRemove(nick) {
	var users = $$('#users');
	var children = users.children;

	for (var i = 0; i < children.length; i++) {
		var user = children[i];
		if (user.textContent == nick) {
			users.removeChild(user);
		}
	}

	var index = onlineUsers.indexOf(nick);
	if (index >= 0) {
		onlineUsers.splice(index, 1);
	}
}

function usersClear() {
	var users = $$('#users');

	while (users.firstChild) {
		users.removeChild(users.firstChild);
	}

	onlineUsers.length = 0;
}

function userInvite(nick) {
	send({ cmd: 'invite', nick: nick });
}

function userIgnore(nick) {
	ignoredUsers.push(nick);
}

/* color scheme switcher */

var schemes = [
	'android',
	'android-white',
	'atelier-dune',
	'atelier-forest',
	'atelier-heath',
	'atelier-lakeside',
	'atelier-seaside',
	'banana',
	'bright',
	'bubblegum',
	'chalk',
	'default',
	'eighties',
	'fresh-green',
	'greenscreen',
	'hacker',
	'maniac',
	'mariana',
	'military',
	'mocha',
	'monokai',
	'nese',
	'ocean',
	'omega',
	'pop',
	'railscasts',
	'solarized',
	'tk-night',
	'tomorrow',
	'carrot',
	'lax',
	'Ubuntu',
	'gruvbox-light',
	'fried-egg',
	'background-img'
];

var highlights = [
	'agate',
	'androidstudio',
	'atom-one-dark',
	'darcula',
	'github',
	'rainbow',
	'tk-night',
	'tomorrow',
	'xcode',
	'zenburn'
]

var currentScheme = 'atelier-dune';
var currentHighlight = 'darcula';

function setScheme(scheme) {
	currentScheme = scheme;
	$$('#scheme-link').href = "schemes/" + scheme + ".css";
	localStorageSet('scheme', scheme);
}

function setHighlight(scheme) {
	currentHighlight = scheme;
	$$('#highlight-link').href = "vendor/hljs/styles/" + scheme + ".min.css";
	localStorageSet('highlight', scheme);
}

// Add scheme options to dropdown selector
schemes.forEach(function (scheme) {
	var option = document.createElement('option');
	option.textContent = scheme;
	option.value = scheme;
	if (option.value == 'background-img') {
		option.disabled = true
	}
	$$('#scheme-selector').appendChild(option);
});

highlights.forEach(function (scheme) {
	var option = document.createElement('option');
	option.textContent = scheme;
	option.value = scheme;
	$$('#highlight-selector').appendChild(option);
});

$$('#scheme-selector').onchange = function (e) {
	setScheme(e.target.value);
}

$$('#highlight-selector').onchange = function (e) {
	setHighlight(e.target.value);
}

// Load sidebar configaration values from local storage if available
if (localStorageGet('scheme')) {
	setScheme(localStorageGet('scheme'));
}

if (localStorageGet('highlight')) {
	setHighlight(localStorageGet('highlight'));
}

$$('#scheme-selector').value = currentScheme;
$$('#highlight-selector').value = currentHighlight;

/* main */

if (myChannel == '') {
	pushMessage({ text: homeText });
	$$('#footer').classList.add('hidden');
	$$('#sidebar').classList.add('hidden');
} else {
	join(myChannel);
}
