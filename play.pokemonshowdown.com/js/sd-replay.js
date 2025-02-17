/**
 * This file is supposed to load a replay into replay.html
 */

window.exports = window;

function linkStyle(url) {
	var linkEl = document.createElement("link");
	linkEl.rel = "stylesheet";
	linkEl.href = url;
	document.head.appendChild(linkEl);
}
function requireScript(url) {
	var scriptEl = document.createElement("script");
	scriptEl.src = url;
	document.head.appendChild(scriptEl);
}

linkStyle("https://play.pokemonshowdown.com/style/font-awesome.css?");
linkStyle("style/battle.css?a7");
linkStyle("style/replay.css?a7");
linkStyle("https://play.pokemonshowdown.com/style/utilichart.css?a7");

requireScript("https://play.pokemonshowdown.com/js/lib/ps-polyfill.js");
requireScript("../config/config.js");
requireScript("https://play.pokemonshowdown.com/js/lib/jquery-1.11.0.min.js");
requireScript(
	"https://play.pokemonshowdown.com/js/lib/html-sanitizer-minified.js"
);
requireScript("https://play.pokemonshowdown.com/js/battle-sound.js");
requireScript("js/battledata.js");
requireScript("https://play.pokemonshowdown.com/data/pokedex-mini.js?a7");
requireScript("https://play.pokemonshowdown.com/data/pokedex-mini-bw.js?a7");
requireScript("data/graphics.js?a7");
requireScript("data/customs/custom-icons.js");

requireScript("data/pokedex.js");
requireScript("data/moves.js");
requireScript("data/abilities.js");
requireScript("data/items.js");
requireScript("data/teambuilder-tables.js");
requireScript("js/battle-tooltips.js");
requireScript("js/battle.js");

var Replays = {
	battle: null,
	muted: false,
	init: function () {
		this.$el = $(".wrapper");
		if (!this.$el.length) {
			$("body").append(
				'<div class="wrapper replay-wrapper" style="max-width:1180px;margin:0 auto"><div class="battle"></div><div class="battle-log"></div><div class="replay-controls"></div><div class="replay-controls-2"></div>'
			);
			this.$el = $(".wrapper");
		}

		var id = $("input[name=replayid]").val() || "";
		var log = ($("script.battle-log-data").text() || "").replace(
			/\\\//g,
			"/"
		);

		var self = this;
		this.$el.on("click", ".chooser button", function (e) {
			self.clickChangeSetting(e);
		});
		this.$el.on("click", "button", function (e) {
			var action = $(e.currentTarget).data("action");
			if (action) self[action]();
		});

		this.battle = new Battle({
			id: id,
			$frame: this.$(".battle"),
			$logFrame: this.$(".battle-log"),
			log: log.split("\n"),
			isReplay: true,
			paused: true,
			autoresize: true,
		});

		this.$(".replay-controls-2").html(
			'<div class="chooser leftchooser speedchooser"> <em>Speed:</em> <div><button value="hyperfast">Hyperfast</button><button value="fast">Fast</button><button value="normal" class="sel">Normal</button><button value="slow">Slow</button><button value="reallyslow">Really Slow</button></div> </div> <div class="chooser colorchooser"> <em>Color&nbsp;scheme:</em> <div><button class="sel" value="light">Light</button><button value="dark">Dark</button></div> </div> <div class="chooser soundchooser" style="display:none"> <em>Music:</em> <div><button class="sel" value="on">On</button><button value="off">Off</button></div> </div>'
		);

		// this works around a WebKit/Blink bug relating to float layout
		var rc2 = this.$(".replay-controls-2")[0];
		// eslint-disable-next-line no-self-assign
		if (rc2) rc2.innerHTML = rc2.innerHTML;

		if (window.HTMLAudioElement)
			$(".soundchooser, .startsoundchooser").show();
		this.update();
		this.battle.subscribe(function (state) {
			self.update(state);
		});
	},
	$: function (sel) {
		return this.$el.find(sel);
	},
	clickChangeSetting: function (e) {
		e.preventDefault();
		var $chooser = $(e.currentTarget).closest(".chooser");
		var value = e.currentTarget.value;
		this.changeSetting($chooser, value, $(e.currentTarget));
	},
	changeSetting: function (type, value, valueElem) {
		var $chooser;
		if (typeof type === "string") {
			$chooser = this.$("." + type + "chooser");
		} else {
			$chooser = type;
			type = "";
			if ($chooser.hasClass("colorchooser")) {
				type = "color";
			} else if ($chooser.hasClass("soundchooser")) {
				type = "sound";
			} else if ($chooser.hasClass("speedchooser")) {
				type = "speed";
			}
		}
		if (!valueElem) valueElem = $chooser.find("button[value=" + value + "]");

		$chooser.find("button").removeClass("sel");
		valueElem.addClass("sel");

		switch (type) {
			case "color":
				if (value === "dark") {
					$(document.body).addClass("dark");
				} else {
					$(document.body).removeClass("dark");
				}
				break;

			case "sound":
				// remember this is reversed: sound[off] === muted[true]
				this.muted = value === "off";
				this.battle.setMute(this.muted);
				this.$(".startsoundchooser").remove();
				break;

			case "speed":
				var fadeTable = {
					hyperfast: 40,
					fast: 50,
					normal: 300,
					slow: 500,
					reallyslow: 1000,
				};
				var delayTable = {
					hyperfast: 1,
					fast: 1,
					normal: 1,
					slow: 1000,
					reallyslow: 3000,
				};
				this.battle.messageShownTime = delayTable[value];
				this.battle.messageFadeTime = fadeTable[value];
				this.battle.scene.updateAcceleration();
				break;
		}
	},
	update: function (state) {
		if (state === "error") {
			var m = /^([a-z0-9]+)-[a-z0-9]+-[0-9]+$/.exec(this.battle.id);
			if (m) {
				this.battle.log(
					'<hr /><div class="chat">This replay was uploaded from a third-party server (<code>' +
						BattleLog.escapeHTML(m[1]) +
						'</code>). It contains errors.</div><div class="chat">Replays uploaded from third-party servers can contain errors if the server is running custom code, or the server operator has otherwise incorrectly configured their server.</div>',
					true
				);
			}
			return;
		}

		if (BattleSound.muted && !this.muted) this.changeSetting("sound", "off");

		if (this.battle.paused) {
			var resetDisabled = !this.battle.started ? " disabled" : "";
			this.$(".replay-controls").html(
				'<button data-action="play"><i class="fa fa-play"></i> Play</button><button data-action="reset"' +
					resetDisabled +
					'><i class="fa fa-undo"></i> Reset</button> <button data-action="rewind"><i class="fa fa-step-backward"></i> Last turn</button><button data-action="ff"><i class="fa fa-step-forward"></i> Next turn</button> <button data-action="ffto"><i class="fa fa-fast-forward"></i> Go to turn...</button> <button data-action="switchViewpoint"><i class="fa fa-random"></i> Switch sides</button>'
			);
		} else {
			this.$(".replay-controls").html(
				'<button data-action="pause"><i class="fa fa-pause"></i> Pause</button><button data-action="reset"><i class="fa fa-undo"></i> Reset</button> <button data-action="rewind"><i class="fa fa-step-backward"></i> Last turn</button><button data-action="ff"><i class="fa fa-step-forward"></i> Next turn</button> <button data-action="ffto"><i class="fa fa-fast-forward"></i> Go to turn...</button> <button data-action="switchViewpoint"><i class="fa fa-random"></i> Switch sides</button>'
			);
		}
	},
	pause: function () {
		this.battle.pause();
	},
	play: function () {
		this.battle.play();
	},
	reset: function () {
		this.battle.reset();
	},
	ff: function () {
		this.battle.seekBy(1);
	},
	rewind: function () {
		this.battle.seekBy(-1);
	},
	ffto: function () {
		var turn = prompt("Turn?");
		if (!turn || !turn.trim()) return;
		if (turn === "e" || turn === "end" || turn === "f" || turn === "finish")
			turn = Infinity;
		turn = Number(turn);
		if (isNaN(turn) || turn < 0) alert("Invalid turn");
		this.battle.seekTurn(turn);
	},
	switchViewpoint: function () {
		this.battle.switchViewpoint();
	},
};

function queryString(url) {
	const str1 = url.split("?")[1];
	const params = {};

	if (str1) {
		const pairs = str1.split("&");
		for (const pair of pairs) {
			const [key, value] = pair.split("=");
			params[key] = decodeURIComponent(value.replace(/\+/g, " "));
		}
	}

	return params;
}

const makePostRequest = async (url, body) => {
	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json(); // Parse JSON response
		console.log("Response Data:", data);
		return data;
	} catch (error) {
		throw error;
	}
};

window.onload = function () {
	const replay = queryString(window.location.href);
	console.log(replay);
	if (!replay.id)
		return (document.getElementById("loading").innerHTML =
			"This is not the replay link you're looking for..");
	makePostRequest("http://localhost:3000/getreplay", {
		replayid: replay.id.trim(),
	})
		.then((data) => {
			if (data.replay) {
				document.getElementById("loading").innerHTML = `${
					data.replay.title
				} <br> <small> ${
					data.replay.id
				} <br> <small style="font-weight:400;"> <i> Uploaded by <b> ${data.replay.uploadedBy} on ${(new Date(
					data.replay.uploadTime
			)).toString().split(" ").slice(1,4).join(" ")} </i></small></small>`;
				document.getElementById("replay-logs").innerHTML += data.log;
				Replays.init();
			} else {
				document.getElementById("loading").style.color = "red";
				document.getElementById("loading").innerHTML = data.message
					? data.message
					: "Error loading replay";
			}
		})
		.catch((error) => {
			document.getElementById("loading").style.color = "red";
			document.getElementById("loading").innerHTML = error.message.includes(
				"404"
			)
				? "Replay not found"
				: "Error loading replay";
		});
	//Replays.init();
};

if (window.matchMedia) {
	if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
		document.body.className = "dark";
	}
	window
		.matchMedia("(prefers-color-scheme: dark)")
		.addEventListener("change", function (event) {
			document.body.className = event.matches ? "dark" : "";
		});
}
