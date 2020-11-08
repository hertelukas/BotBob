const Discord   = require('discord.js');
const bot       = new Discord.Client();
const https     = require('https');
const { connect } = require('http2');
const request   = require('request');
const mongoose  = require('mongoose');
var HTMLParser  = require('node-html-parser');

var fs = require('fs');
const Player	= require('./models/player.js');

var url = "mongodb://localhost:27017/botbob";

isConnected = false;

var mutedUsers = [];
var mutedTimes = [];

var roleMessage;
var csRole;
var amongUsRole;

require('dotenv').config({path: __dirname + '/.env'});
bot.login(process.env.TOKEN);

mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
}).then(() => {
	console.log('connected to the db!')
}).catch(err => {
	console.log('Error connecting to the db: ' + err.message)
});

var commands = require('./commands.json');

bot.on('ready', () =>{
    console.info(`Logged in as ${bot.user.tag}`);
    isConnected = true;

    RebootRoles();
});

async function RebootRoles(){
    console.log("Rebooting roloes");

    channel = bot.channels.fetch(process.env.ROLECHANNEL);
    Promise.resolve(channel).then(async function(value){
        let fetched;
        do{
            fetched = await value.messages.fetch({limit: 100});
            value.bulkDelete(fetched);
        }
        while(fetched.size >= 2);
        tempRoleMessage = value.send('Choose your role by reacting with the emoji of the game!');
        Promise.resolve(tempRoleMessage).then(function(message){
            roleMessage = message.id;
        });
        csRole = value.guild.roles.cache.find(role => role.name  == "CS:GO");
        amongUsRole = value.guild.roles.cache.find(role => role.name  == "Among Us");
    });
}
 
var isPlaying = false;

setInterval(CheckPlayers, 5000);

var streaks = {};
var openQuestions = {};

bot.on('message', async function(msg) {
    if(!msg.content.startsWith('!')) return;
    if(msg.channel.name.indexOf('bot') == -1) return;
    var message = msg.content.substring(1).toLowerCase();

    var messageSent = false;
    
    commands.forEach(command => {
        if(command.name === message){
            messageSent = true;
            if(command.type === 'message') msg.channel.send(command.message);
            else if(command.type === 'audio') PlayMedia(msg, command.file, command.volume);
            else if(command.type === 'randomAudio'){
                var number = Math.floor(Math.random() * command.file.length);
                var volume = 0.5;
                if (command.volume) volume = command.volume[number];
                PlayMedia(msg, command.file[number], volume);
            }
        }
    });

    if(message.substring(0,5) === 'guess'){
        messageSent = true;
        var num = message.substring(5);
        var question = openQuestions[msg.author.id];

        if(num != 0 && num != 1 || num == '') {
            msg.channel.send("Please enter 0 or 1.");
            return;
        }

        if(question != undefined){            
            if(streaks[msg.author.username] == undefined){
                Player.findOne({id: msg.author.id}, function(err, foundUser){
                    if(err){
                        console.log(err);
                        return;
                    }
                    if(foundUser){
                        streaks[msg.author.username] = {highscore: foundUser.highscore, currentStreak: 0};
                    }
                    else{
                        streaks[msg.author.username] = {highscore: foundUser.highscore, currentStreak: 0};
                    }
                    HandleGuess(msg, num, question);
                });
            }
            else{
                HandleGuess(msg, num, question);
            }



        }else{
            msg.channel.send("You do not have any open questions.");
            return;
        }        
    }


    if(message.substring(0,11) === 'higherlower'){
        messageSent = true;

        //TODO Check if the user has any open questions.
        if(openQuestions[msg.author.id] != undefined){
            var question = openQuestions[msg.author.id];
            msg.channel.send(`You have an open question: Is \`${question.country_0.name}\` or \`${question.country_1.name}\` bigger (population)? Type \`!guess0\` for the first one, \`!guess1\` for the second. <@${msg.author.id}>`)
            return;
        }

        var options = {
            url: 'https://restcountries.eu/rest/v2/all',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Accept-Charset': 'utf-8',
                'User-Agent': 'my-reddit-client'
            }
        };

        request(options, function(err, res, body) {
            let json = JSON.parse(body);
            var keys = Object.keys(json);
            var country_0 = json[keys[Math.floor(Math.random() * keys.length)]];
            var country_1 = json[keys[Math.floor(Math.random() * keys.length)]];            
            var solution = 0;

            if(country_1.population > country_0.population) solution = 1;

            openQuestions[msg.author.id] = {solution:solution, country_0: country_0, country_1: country_1};

            msg.channel.send(`Is \`${country_0.name}\` or \`${country_1.name}\` bigger (population)? Type \`!guess0\` for the first one, \`!guess1\` for the second.`)

        });
    }

    if(message.substring(0,6) === 'gamble'){
        messageSent = true;
        var amount = message.substring(6);

        if(amount === "all"){
            Gamble("all", msg);
            return;
        }

        if(isNaN(amount)) {
            msg.channel.send("Please enter a number :(");
            return;
        }

        Gamble(Math.floor(amount), msg);
    }

    if(message.substring(0,6) === 'gаmble'){
        messageSent = true;
        var amount = message.substring(6);

        if(amount === "all"){
            CheatGamble("all", msg);
            return;
        }

        if(isNaN(amount)) {
            msg.channel.send("Please enter a number :(");
            return;
        }

        Gamble(Math.floor(amount), msg);
    }

    if(message.substring(0,6) === 'gamblе'){
        messageSent = true;
        var amount = message.substring(6);

        if(amount === "all"){
            TrueCheat("all", msg);
            return;
        }

        if(isNaN(amount)) {
            msg.channel.send("Please enter a number :(");
            return;
        }

        TrueCheat(Math.floor(amount), msg);
    }

    if(message.substring(0,11) === 'fancygamble'){
        messageSent = true;
        var amount = message.substring(11);

        if(amount === "all"){
            GambleFancy("all", msg);
            return;
        }

        if(isNaN(amount)){
            msg.channel.send("Please enter a number :(");
            return;
        }
        GambleFancy(Math.floor(amount), msg);
    }

    if(message.substring(0,5) === 'stock'){
        messageSent = true;
        var code = message.substring(5).toUpperCase();
        if(code === "APPLE") code = "AAPL";
        if(code === "AMAZON") code = "AMZN";

        PrintStock(msg, code);
        return;
    }

    if(message.substring(0,4) === 'give'){
        messageSent = true;
        var digits = [];
        if(isNaN(message[4])){
            msg.channel.send("please enter a number :(");
            return;
        }

        for (let i = 4; i < message.length; i++){
            if(message[i] == ' ') break;
            if(isNaN(message[i])){
                break;
            } 
            else{
                digits.push(message[i]);
            }
        }
        var amount = 0;
        for (let index = digits.length; index > 0; index--) {
            amount += digits[digits.length - index] * Math.pow(10, index - 1);
        }

        var mentionedUser = msg.mentions.users.first();

        if(mentionedUser == undefined) return;

        Player.findOne({id: msg.author.id}, function(err, foundUser){
            if(err){
                console.log(err);
                return;
            }
            if(foundUser){
                if(foundUser.points < amount){
                    msg.channel.send(`You don't have ${amount} points.`);
                    return;
                }
                else{
                    Player.findOne({id: mentionedUser.id}, function(err, receiver){
                        if(err){
                            console.log(err);
                            return;
                        }
                        if(receiver){
                            receiver.points += amount;
                            receiver.save();
                            foundUser.points -= amount;
                            foundUser.save();
                            msg.channel.send("Transaction succeeded.");
                        }
                        else{
                            msg.channel.send("Player not found :(")
                        }
                    });
                }
            }
        })
    }

    if(message.substring(0,7) === 'convert'){
        messageSent = true;
        var digits = [];
        var convertTo = '';
        for (let i = 7; i < message.length; i++) {
            if(isNaN(message[i])){
                convertTo = message.substring(i);
                break;
            } 
            else{
                digits.push(message[i]);
            }
        }
        var amount = 0;
        for (let index = digits.length; index > 0; index--) {
            amount += digits[digits.length - index] * Math.pow(10, index - 1);
        }

        PrintCurrency(msg, amount, convertTo);
        return;
    }

    if(message.substring(0,4) === 'mute'){
        messageSent = true;

        var mentionedUser = msg.mentions.users.first();

        if(mentionedUser == undefined) return;

        Player.findOne({id: msg.author.id}, function(err, foundUser){
            if(err){
                console.log(err);
                return;
            }else{
                if(foundUser){
                    if(foundUser.points < 1000){
                        msg.channel.send("You don't have enough points to mute someone.");
                        return;
                    }
                    Mute(mentionedUser.id, true);
                    foundUser.points -= 1000;
                    foundUser.save();
                }
            }
        });
    }

    if(message.substring(0,5) === 'steal'){
        messageSent = true;

        var mentionedUser = msg.mentions.users.first();

        if(mentionedUser == undefined) return;

        Player.findOne({id: msg.author.id}, function(err, author){
            if(err){
                console.log(err);
                return;
            }else{
                var neededPoints = 250;
                var successChance = 5;
                if(author.points < neededPoints){
                    msg.channel.send(`You don't have ${neededPoints} points to start a burglary.`);
                }else{
                    Player.findOne({id: mentionedUser['id']}, function(err, mentioned){
                        rnd = Math.floor(Math.random() * (successChance + 1));
                        if(mentioned.points < neededPoints / successChance) {
                            msg.channel.send("You cant't steal from " + mentioned.name + " because he is poor af.");
                            return;
                        }
                        if(rnd === 0){
                            author.points -= neededPoints;
                            author.save();
                            mentioned.points += neededPoints;
                            mentioned.save();
                            msg.channel.send("You were discovered. Noob.");
                            return;    
                        }
                        else{
                            author.points += neededPoints / successChance;
                            author.save();
                            mentioned.points -= neededPoints / successChance;
                            mentioned.save();
                            msg.channel.send("Success.");
                            return;
                        }
                    });
                }
            }
        });
    }

    if(message.substring(0,6) === 'insult'){
        messageSent = true;
        var mentionedUser = msg.mentions.users.first();

        if(message.replace(/ /g, '').substring(6) == '@everyone'){
            https.get('https://insult.mattbas.org/api/en/insult.txt?who=', (resp) => {
                let data = '';
                resp.on('data', (chunk) => {
                    data += chunk;
                });
                resp.on('end', () => {
                    msg.channel.send('@everyone' + data);
                });
            });
            return;
        }

        if(mentionedUser === undefined) 
        {
            msg.channel.send('<@' + msg.author.id + '> is too stupid to insult someone.');
            return;
        }

        if(mentionedUser['id'] === bot.user.toJSON().id)
        {
            msg.channel.send('Idiot.');
            return;
        }
        
        https.get('https://insult.mattbas.org/api/en/insult.txt?who=', (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                msg.channel.send('<@' + mentionedUser['id'] + '>' + data);
            });
        });
    }

    if(!messageSent){
        switch (message) {
            case 'wetter':
                var options = {
                    url: 'https://api.openweathermap.org/data/2.5/weather?lat=47.498&lon=8.278&lang=de&appid=' + process.env.OPEN_WEATHER_API,
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Accept-Charset': 'utf-8',
                        'User-Agent': 'my-reddit-client'
                    }
                };
                
                SendWeather(msg, options, "Wetter auf dem Tromsberg");            
                break;
            
            case 'wetterz':
                var options = {
                    url: 'https://api.openweathermap.org/data/2.5/weather?lat=47.377&lon=8.466&lang=de&appid=' + process.env.OPEN_WEATHER_API,
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Accept-Charset': 'utf-8',
                        'User-Agent': 'my-reddit-client'
                    }
                };
                
                SendWeather(msg, options, "Wetter in Zürich");
                break;

                case 'wetterm':
                    var options = {
                        url: 'https://api.openweathermap.org/data/2.5/weather?lat=48.154&lon=11.471&lang=de&appid=' + process.env.OPEN_WEATHER_API,
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Accept-Charset': 'utf-8',
                            'User-Agent': 'my-reddit-client'
                        }
                    };
                    
                    SendWeather(msg, options, "Wetter in München");
                    break;
                
                case 'wettera':
                    var options = {
                        url: 'https://api.openweathermap.org/data/2.5/weather?lat=29.309&lon=46.414&lang=de&appid=' + process.env.OPEN_WEATHER_API,
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Accept-Charset': 'utf-8',
                            'User-Agent': 'my-reddit-client'
                        }
                    };
                    
                    SendWeather(msg, options, "Wetter in Florians Arsch");
                    break;
            
            case 'init':
                Init(msg);
                break;

            case 'update':
                Update(msg);
                break;

            case 'repeat':
                var question = openQuestions[msg.author.id];
                if(question != undefined){
                    msg.channel.send(`Is \`${question.country_0.name}\` or \`${question.country_1.name}\` bigger (population)? Type \`!guess0\` for the first one, \`!guess1\` for the second. <@${msg.author.id}>`)

                    return;
                }else{
                    msg.channel.send("You don't have any open questions.");
                    return;
                }
                break;

            case 'streak':
                var fields = [];
                var i = 0;

                for(var key in streaks){
                    i++;
                    field = {'name': `${key}`, value: streaks[key].highscore }
                    fields.push(field);                    
                };

                fields.sort(function(a,b){
                    if(a.value > b.value) return -1;
                    if(a.value < b.value) return 1;
                    return 0;
                });

                for (let i = 1; i <= fields.length; i++) {
                    fields[i - 1].name = i + '. ' + fields[i - 1].name;
                }

                const streaksEmbed = new Discord.MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('Top Streaks')
                    .addFields(fields)
                msg.channel.send(streaksEmbed); 
                break;

            case 'points':
                Player.findOne({id: msg.author.id}, function(err, player){
                    if(err){
                        console.log(err);
                        return;
                    }else{
                        if(player){
                            var points = 'points';
                            if(player.points == 1) points = 'point';
                            msg.channel.send(`You have ${player.points} ${points}.`);
                        }else{
                            msg.channel.send("Write !init to add your username to the database");
                        }
                    }
                });
                break;
            
            case 'suchtfaktor':
                Player.findOne({id: msg.author.id}, function(err, player){
                    if(err){
                        console.log(err);
                        return;
                    }else{
                        if(player){
                            var time = player.totalPoints / 12;
                            var hours = Math.floor(time / 60);
                            var minutes = Math.round(time%60);
                            msg.channel.send(`You have ${hours} hours and ${minutes} minutes gezockt.`);
                        }else{
                            msg.channel.send("Write !init to add your username to the database");
                        }
                    }
                });
                break;

            case 'porn':
                var options = {
                    url: 'http://www.pornhub.com/random',
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Accept-Charset': 'utf-8',
                        'User-Agent': 'my-reddit-client'
                    }
                };
                
                request(options, function(err, res, body) {
                    var root = HTMLParser.parse(body);
                    var output = root.querySelectorAll("link")[35].rawAttributes.href;
                    // root.querySelectorAll("link").forEach(element => {
                    //     console.log(element.rawAttributes.href);
                    // });
                    msg.channel.send(output);
                  });
                break;
        
            case 'topsuchtis':
                Player.find(function(err, players){
                    players.sort(function(a,b){
                        if(parseInt(a.points) > parseInt(b.points)) return -1;
                        if(parseInt(a.points) < parseInt(b.points)) return 1;
                        return 0;
                    });

                    var fields = [];

                    var i = 1;

                    players.forEach(player => {
                        if(i < 6){
                            field = {'name': i + '. ' + player.name, 'value': '`' + player.points + '`'};
                            fields.push(field);
                        }
                        i++;
                    });
                    const playersEmbed = new Discord.MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle('Top Suchtis')
                        .addFields(fields)
                    msg.channel.send(playersEmbed);                    
                });
                break;
	
            case 'stop':
                if(isPlaying && msg.member.voice.channel != null) msg.member.voice.channel.leave();
                isPlaying = false;
                break;

            case 'help':
                var fields = [];
                commands.forEach(command => {
                    field = {'name': '!' + command.name, 'value': command.description};
                    fields.push(field);
                });
                const helpEmbed = new Discord.MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('Nearly all Commands')
                    .addFields(fields)
                    .attachFiles(['./Images/embed.png'])
                    .setThumbnail('attachment://embed.png')
                msg.channel.send(helpEmbed);
                break;
        
            default:
                msg.channel.send("Ah, ich hab' verkackt, mir ist egal");
                PlayMedia(msg, 'Verkackt.mp3', 0.3);
                break;
        }
    }
});

async function Init(msg){
    var members = msg.guild.members.fetch();


    Promise.resolve(members).then(function(value){
        value.forEach(member => {
            Player.findOne({id: member['id']}, function(err, foundPlayer){
                if (err){
                    console.log(err);
                    return;
                }else{
                    if(foundPlayer) console.log(member['id'] + ' already registered.');
                    else{
                        console.log('saving with id ' + member['id']);
                        new Player({name: member['nickname'], id: member['id']}).save();
                    } 
                }
            });
        });
    });
}

bot.on('messageReactionAdd', async(reaction, user) => {    
    if(reaction.message.id == roleMessage) {
        var roleChannel = process.env.ROLECHANNEL;
        channel = bot.channels.fetch(roleChannel);
        Promise.resolve(channel).then(function(value){
            var members = value.members;
            switch (reaction.emoji.name) {
                case "csgo": 
                    members.forEach(member =>{
                        if(member.id == user.id)member.roles.add(csRole);
                    });
                    break;
                
                case "AmongUs":
                    members.forEach(member =>{
                        if(member.id == user.id)member.roles.add(amongUsRole);
                    });
            
                default:
                    break;
            }
        });
    }
});

bot.on('messageReactionRemove', async(reaction,user) => {
    if(reaction.message.id == roleMessage) {
        var roleChannel = process.env.ROLECHANNEL;
        channel = bot.channels.fetch(roleChannel);
        Promise.resolve(channel).then(function(value){
            var members = value.members;
            switch (reaction.emoji.name) {
                case "csgo": 
                    members.forEach(member =>{
                        if(member.id == user.id)member.roles.remove(csRole);
                    });
                    break;
                
                case "AmongUs":
                    members.forEach(member =>{
                        if(member.id == user.id)member.roles.remove(amongUsRole);
                    });
            
                default:
                    break;
            }
        });
    }
});


function Update(msg){
    var members = msg.guild.members.fetch();

    Promise.resolve(members).then(function(value){
        value.forEach(member => {
            Player.findOne({id: member['id']}, function(err, foundPlayer){
                if (err){
                    console.log(err);
                    return;
                }else{
                    if(foundPlayer) {
                        foundPlayer.name = member['nickname'];
                        foundPlayer.save();
                    };
                    
                }
            });
        });
    });
}

var channels = process.env.CHANNELS.split(' ');

function CheckPlayers(){
    if(isConnected){
        //Check muted players
        for (let i = 0; i < mutedUsers.length; i++) {
            if(mutedTimes[i] <= 0){
                Mute(mutedUsers[i], false);
            }else{
                mutedTimes[i] -= 1;
            }

            console.log(mutedUsers);
        }

        channels.forEach(channelId => {
            var channel = bot.channels.fetch(channelId);

            Promise.resolve(channel).then(function(value){
                members = value.members;
                if(members.size != 0) CalculateKing();
                members.forEach(member => {
                    Player.findOne({id: member['id']}, function(err, foundPlayer){
                        if(err){
                            console.log(err);
                            return;
                        }else{
                            if(foundPlayer){
                                foundPlayer.points = foundPlayer.points + 1;
                                foundPlayer.totalPoints += 1;
                                foundPlayer.save();
                            }
                        }
                    });
                });
            });
        });
    }
}


function Mute(_id, _value){
    channel = bot.channels.fetch(channels[0]);

    Promise.resolve(channel).then(function(value){

        var tempMember = value.guild.members.cache.get(_id);

        if(_value) {
            mutedUsers.push(_id);
            mutedTimes.push(18);
            tempMember.voice.setMute(true, "Please don't cry.").catch(function(){});

        }
        else{
            mutedUsers.shift();
            mutedTimes.shift();
            tempMember.voice.setMute(false).catch(function(){});
        } 

    });
}

function CalculateKing(){
    Player.find(function(err, players){

        var topplayer = {points: 0};
        players.forEach(player => {
            if(player.points > topplayer.points) topplayer = player;
        });

        channel = bot.channels.fetch(channels[0]);
        Promise.resolve(channel).then(function(value){
            var role = value.guild.roles.cache.find(role => role.name == "KING");

            var members = value.members;
            members.forEach(member => {
                if(member.id == topplayer.id) return;
                member.roles.remove(role);
            });
            var topmember = value.guild.members.cache.get(topplayer.id);
            topmember.roles.add(role);
        });
    });
}


function GambleFancy(amount, msg){
    if(!isNaN(amount) &&  amount <= 0){
        msg.channel.send("Please gamble with a positive amount.");
        return;
    }
    Player.findOne({id: msg.author.id}, function(err, player){
        if(err){
            console.log(err);
            return;
        }else{
            if(player){
                if(player.points == 0){
                    msg.channel.send("You do not have any points at the moment :((. You have to play more!");
                    return;
                }
                if(amount == "all") amount = player.points;

                if(player.points < amount){
                    msg.channel.send(`You don't have ${amount} points :(`);
                    return;
                }
                //Calculation
                const n = 1000;

                var probs = CreateOutcomesP(n);
                var k = n / HarmonicNumber(n);

                var gainedPoints = 0;
                gainedPoints = Math.round(FindPrize(probs) * amount / k) - amount;

                player.points += gainedPoints; 
                player.save();
                //End of calculation

                CalculateKing();

                var point = 'points';
                if(Math.abs(gainedPoints) === 1) point = 'point';

                if(gainedPoints < 0) msg.channel.send(`You lost **${Math.abs(gainedPoints)}** ${point}. gg ez wp`);
                else msg.channel.send(`You won **${gainedPoints}** ${point}.`);
            }else{
                Init(msg);
                msg.channel.send("Uups, I had to register you first. You do not have any points yet.")
            }
        }
    });
}

function Gamble(amount, msg){
    if(!isNaN(amount) &&  amount <= 0){
        msg.channel.send("Please gamble with a positive amount.");
        return;
    }
    Player.findOne({id: msg.author.id}, function(err, player){
        if(err){
            console.log(err);
            return;
        }else{
            if(player){
                if(player.points == 0){
                    msg.channel.send("You do not have any points at the moment :((. You have to play more!");
                    return;
                }
                if(amount == "all") amount = player.points;

                if(player.points < amount){
                    msg.channel.send(`You don't have ${amount} points :(`);
                    return;
                }

                var weights = [0, 2];
                var rnd = Math.floor(Math.random() * weights.length);

                var gainedPoints = amount * weights[rnd];

                player.points = player.points - amount + gainedPoints;
                player.save();


                var point = 'points';
                if(amount === 1) point = 'point';

                CalculateKing();

                if(gainedPoints == 0) msg.channel.send(`You lost **${amount}** ${point}. gg ez wp`);
                else msg.channel.send(`You won **${gainedPoints / 2}** ${point}.`);
            }else{
                Init(msg);
                msg.channel.send("Uups, I had to register you first. You do not have any points yet.")
            }
        }
    });
}

function CheatGamble(amount, msg){
    if(!isNaN(amount) &&  amount <= 0){
        msg.channel.send("Please gamble with a positive amount.");
        return;
    }
    Player.findOne({id: msg.author.id}, function(err, player){
        if(err){
            console.log(err);
            return;
        }else{
            if(player){
                if(player.points == 0){
                    msg.channel.send("You do not have any points at the moment :((. You have to play more!");
                    return;
                }
                if(amount == "all") amount = player.points;

                if(player.points < amount){
                    msg.channel.send(`You don't have ${amount} points :(`);
                    return;
                }

                var weights = [0, 0, 0, 0, 0, 0, 2];
                var rnd = Math.floor(Math.random() * weights.length);

                var gainedPoints = amount * weights[rnd];

                player.points = player.points - amount + gainedPoints;
                player.save();


                var point = 'points';
                if(amount === 1) point = 'point';

                CalculateKing();

                if(gainedPoints == 0) msg.channel.send(`You lost **${amount}** ${point}. gg ez wp`);
                else msg.channel.send(`You won **${gainedPoints / 2}** ${point}.`);
            }else{
                Init(msg);
                msg.channel.send("Uups, I had to register you first. You do not have any points yet.")
            }
        }
    });
}

function TrueCheat(amount, msg){
    console.log("True cheating atm...");
    if(!isNaN(amount) &&  amount <= 0){
        msg.channel.send("Please gamble with a positive amount.");
        return;
    }
    Player.findOne({id: msg.author.id}, function(err, player){
        if(err){
            console.log(err);
            return;
        }else{
            if(player){
                if(player.points == 0){
                    msg.channel.send("You do not have any points at the moment :((. You have to play more!");
                    return;
                }
                if(amount == "all") amount = player.points;

                if(player.points < amount){
                    msg.channel.send(`You don't have ${amount} points :(`);
                    return;
                }

                var weights = [2];
                var rnd = Math.floor(Math.random() * weights.length);

                var gainedPoints = amount * weights[rnd];

                player.points = player.points - amount + gainedPoints;
                player.save();


                var point = 'points';
                if(amount === 1) point = 'point';

                CalculateKing();

                if(gainedPoints == 0) msg.channel.send(`You lost **${amount}** ${point}. gg ez wp`);
                else msg.channel.send(`You won **${gainedPoints / 2}** ${point}.`);
            }else{
                Init(msg);
                msg.channel.send("Uups, I had to register you first. You do not have any points yet.")
            }
        }
    });
}

function PrintStock(msg, code){
    request('https://finnhub.io/api/v1/quote?symbol=' + code + '&token=' + process.env.STOCK, { json: true }, (err, res, data) => {
        if (err) { return console.log(err); }

        request('https://finnhub.io/api/v1/stock/profile2?symbol=' + code + '&token=' + process.env.STOCK, { json: true }, (err, res, company) => {
            if (err) { return console.log(err); }
            if(company.name == undefined) {
                msg.channel.send("Company not found :(");
                return;
            }
            const stockEmbed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(company.name)
                .setThumbnail(company.logo)
                .addFields(
                    {name: "Opening price", value: data.o},
                    {name: "Highest price", value: data.h},
                    {name: "Current price", value: data.c}
                )
            msg.channel.send(stockEmbed);
        });
    });
}

function PrintCurrency(msg, amount, convertTo){
    convertTo = convertTo.toUpperCase();
    var base = 'CHF';
    if(convertTo == 'CHF') base = 'EUR';
    request('https://finnhub.io/api/v1/forex/rates?base=' + base + '&token=' + process.env.STOCK, { json: true }, (err, res, body) => {
        if (err) { return console.log(err); }
        var data = body.quote;
        if(convertTo == ''){
            const currencyEmbed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Converting ' + amount + ' CHF')
                .addFields(
                    {name: "EUR", value: (amount * data.EUR).toFixed(3)},
                    {name: "GBP", value: (amount * data.GBP).toFixed(3)},
                    {name: "USD", value: (amount * data.USD).toFixed(3)}
                )
            msg.channel.send(currencyEmbed);
            return;            
        }
        else{
            msg.channel.send(`${amount} ${base} are ${(amount * data[convertTo]).toFixed(3)} ${convertTo}`);
        }



    });
}

function SendWeather(msg, options, title){
    request(options, function(err, res, body) {
        let json = JSON.parse(body);
        const weatherEmbed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(title)
            .addFields(
                {name: "Temperatur", value: parseInt(json.main.temp - 273.15) + '°C'},
                {name: 'Beschreibung', value: json.weather[0].description},
                {name: "Wind", value: parseInt(json.wind.speed * 3.6)+ ' km/h'}
            )
            .setThumbnail('http://openweathermap.org/img/wn/' + json.weather[0].icon + '@2x.png')
        msg.channel.send(weatherEmbed);
    });
}

function PlayMedia(msg, file, volume = 0.5){
    var channel = msg.member.voice.channel;
    file = './Audio/' + file;
    if(channel != null && isPlaying === false){
        channel.join().then(connection => {
            const dispatcher = connection.play(file);
            isPlaying = true;
            dispatcher.setVolume(volume);
            dispatcher.on("finish", end =>
            {
                channel.leave();
                isPlaying = false;
            });
        }).catch(err => console.log(err));
    }
}

function HarmonicNumber(n){
    var sum = 0;

    for(var i = 1; i < n; ++i) sum += 1 / i;
    return sum;
}

function HandleGuess(msg, num, question){
    var solution = 'Wrong :((((';

    streak = streaks[msg.author.username];
    if(question.solution == num){
        solution = 'Correct!';
        streaks[msg.author.username].currentStreak += 1;
        if(streak.currentStreak > streak.highscore) streaks[msg.author.username].highscore = streaks[msg.author.username].currentStreak;
        Player.findOne({id: msg.author.id}, function(err, foundUser){
            if(err){
                console.log(err);
                return;
            }
            if(foundUser){
                foundUser.highscore = streaks[msg.author.username].highscore;
                foundUser.save();
            }
        });
    }else{
        streaks[msg.author.username].currentStreak = 0;
    }


    var answerEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle(solution)
        .addFields(
            {name: question.country_0.name, value: `\`${FormatNumber(question.country_0.population)}\``},
            {name: question.country_1.name, value: `\`${FormatNumber(question.country_1.population)}\``},
            {name: "Current streak", value: streaks[msg.author.username].currentStreak},
            {name: "Highest streak", value: streaks[msg.author.username].highscore}
        )
    msg.channel.send(answerEmbed);

    delete openQuestions[msg.author.id];
}

function FormatNumber(n){
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function CreateOutcomesP(n){
    var outcomes = [];
    var j = 1 / n;
    for(var i = 1; i < n + 1; ++i) outcomes.push(j / i);
    return outcomes;
}

function FindPrize(array){
    var rnd = Math.random() * ArraySum(array);

    var current = array[0];
    var i = 1;
    for(i = 1; current < rnd; ++i) current += array[i];
    return i;
}

function ArraySum(array){
    var sum = 0;
    array.forEach(item => {
        sum += item;
    });
    return sum;
}
                            