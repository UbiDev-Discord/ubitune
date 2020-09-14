const Discord = require("discord.js");
const {
  prefix,
  token
} = require("./config.json");
const ytdl = require("ytdl-core");

const client = new Discord.Client();

const queue = new Map();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setStatus('online');
  client.user.setActivity('u?help', {
    type: 'WATCHING'
  });
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
        author: {
          name: client.user.username,
          icon_url: client.user.avatarURL
        },
        color: 0x42F572,
        title: "A prefixem: u?",
        description: "",
        fields: [{
            name: "PARANCSOK:",
            value: "u?play [YouTUbe URL] - Zene indítása YouTube-ról\nu?skip - Zene átugrása\nu?stop - Zene leállítása\nu?help - Segítség kérése"
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