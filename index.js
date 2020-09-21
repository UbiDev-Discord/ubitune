const Discord = require("discord.js");
const {
  prefix,
  token
} = require("./config.json");
const ytdl = require("ytdl-core");
const opusscript = require("opusscript")
const fs = require('fs');

const client = new Discord.Client();

const queue = new Map();

const activities_list = [
  "https://bit.ly/2YHJDgP", 
  "24/7 uptime",
  "u?help",
  "u?invite"
  ];

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  setInterval(() => {
      const index = Math.floor(Math.random() * (activities_list.length - 1) + 1); // generates a random number between 1 and the length of the activities array list (in this case 5).
      client.user.setActivity(activities_list[index]); // sets bot's activities to one of the phrases in the arraylist.
  }, 5000);
});

client.once("reconnecting", () => {
  console.log("Újracsatlakozás...");
});

client.once("disconnect", () => {
  console.log("Lecsatlakozás...");
});

client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else if (message.content === 'u?help') {
    message.channel.send({
      embed: {
        color: 0x42F572,
        title: "A prefixem: u?",
        description: "",
        fields: [{
            name: "PARANCSOK:",
            value: "u?play [YouTube URL] - Zene indítása YouTube-ról\nu?skip - Zene átugrása\nu?stop - Zene leállítása\nu?help - Segítség kérése\nu?info - érdekes információk a botról\nu?news - A bot újdonságai\nu?invite - Bot meghívójának lekérése"
          },
          {
            name: "SUPPORT SZERVER:",
            value: "https://bit.ly/2YMHcJH"
          },
          {
            name: "BOT MEGHÍVÁSA:",
            value: "https://bit.ly/2YHJDgP"
          }
        ]
      }
    });
  } else if (message.content === 'u?info') {
    message.channel.send({
      embed: {
        color: 0x42F572,
        title: "BOT INFORMÁCIÓK:",
        description: "",
        fields: [{
            name: "prefix:",
            value: "u? (nem változtatható)"
          },
          {
            name: "fő fejlesztő:",
            value: "UbiOne#7240"
          },
          {
            name: "fejlesztő csapat:",
            value: "UbiDev"
          },
          {
            name: "GitHub:",
            value: "https://github.com/UbiDev-Discord/ubitune"
          },
          {
            name: "contributors:",
            value: "Jelenleg senki nem segített se ötletekkel, se kódokkal a bot fejlesztésén."
          },
          {
            name: "programnyelv:",
            value: "JavaScript, Node.js"
          },
          {
            name: "aktív:",
            value: "2020.08.30 óta"
          }
        ]
      }
    });
  } else if (message.content=== 'u?invite') {
    message.channel.send({
      embed: {
        color: 0x42F572,
        title: "MEGHÍVÓ LINKEM:",
        description: "https://bit.ly/2YHJDgP"
      }
    })
  } else if (messasge.content === 'u?news') {
    message.channel.send({
      embed: {
        color: 0x42F572,
        title: "ÚJDONSÁGOK:",
        description: "- Mostantól sokkal több információ tekinthető meg a változó állapoton\n- Bekerült az **u?news** parancs, ahol megtekinthetőek az újdonságok\n- Bekerült a **u?invite** parancs, ahol lekérhető a bot meghívója\n- Bekerült az **u?info** parancs, ahol érdekes információkat nézhetsz meg a botról"
      }
    })
  } else {
    message.channel.send("Ez nem egy létező parancs!");
  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "Fel kell lépned egy hangcsatornára, hogy elinduljon a zene!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "Szükségem van jogokra, hogy felléphessek erre a csatornára!"
    );
  }

  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
    title: songInfo.title,
    url: songInfo.video_url
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} hozzáadva a lejátszási listához!`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Fel kell lépned egy hangcsatornára, hogy elinduljon a zene!"
    );
  if (!serverQueue)
    return message.channel.send("Nincs zene, amit átugorhatnál!");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Fel kell lépned egy hangcsatornára, hogy leállíthasd a zenét!"
    );
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Zene lejátszása: **${song.title}**`);
}

client.login(process.env.token);