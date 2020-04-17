const Discord = require("discord.js");
const { prefix, token } = require("../config.json");
const client = new Discord.Client();
let emoteJoin = "🎮";
let emoteStart = "🟢";
let emoteThumb = "👌";

let emoteKeycaps = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

client.once("ready", () => {
    console.log("Ready!");
});

client.once("reconnecting", () => {
    console.log("Reconnecting!");
});

client.once("disconnect", () => {
    console.log("Disconnect!");
});

const allRoles = ["Werewolf", "Villager", "!Seer", "!Witch", "!Hunter", "!Guard", "!Knight"];
let roles = { Werewolf: 0, Villager: 0, Seer: 0, Witch: 0, Hunter: 0, Guard: 0, Knight: 0 };
let gameOn = false;
let players = [];
let timer;
let werewolvesVote = 0;
let allVotes = 0;
let killTime = 20000; //milliseconds

function makeRolesArray(roles) {
    let rolesArray = [];
    let werewolves = Array(roles.Werewolf).fill("Werewolf");
    let villagers = Array(roles.Villager).fill("Villager");

    rolesArray = werewolves.concat(villagers);

    if (roles.Seer) {
        rolesArray.push("Seer");
    }

    return rolesArray;
}

//this shuffles the roles like a deck of cards for easier random distribution.
function shuffleRoles(rolesArray) {
    let pointer = 0;
    let temp = "";
    for (let i = 0; i < rolesArray.length; i++) {
        pointer = Math.floor(Math.random() * rolesArray.length);
        temp = rolesArray[i];
        rolesArray[i] = rolesArray[pointer];
        rolesArray[pointer] = temp;
    }
}

//this assign the roles by shuffling the rolesArray
function assignRoles(players) {
    let rolesArray = makeRolesArray(roles);
    shuffleRoles(rolesArray);

    for (let i = 0; i < players.length; i++) {
        players[i].role = rolesArray[i];
        console.log(`${players[i].username} got ${players[i].role}`);
    }
}

function playerOptions() {
    let playerOptions = "";
    let number = 0;
    players.forEach((player) => {
        playerOptions += `(${emoteKeycaps[number]} ${player.username})`;
        number += 1;
    });
    return playerOptions;
}

function getTeammate(players, player) {
    let teammateNames = "";
    let teammateCount = 0;
    players.forEach((teammate) => {
        if (teammate.username !== player.username && teammate.role === player.role) {
            teammateNames += `(${teammate.username})`;
            teammateCount += 1;
        }
    });

    if (teammateCount === 0) {
        teammateNames = "you're the only Werewolf!";
    } else if (teammateCount === 1) {
        teammateNames += " is your teammate";
    } else {
        teammateNames += " are your teammates";
    }
    return teammateNames;
}

client.on("message", (message) => {
    if (message.channel.type == "dm") {
        message.author.send("You're not supposed to message the bot!").catch((error) => console.log("Dm error, ignore for now."));
        return;
    }

    if (message.content === `${prefix}play`) {
        let hostId = message.author.id;
        if (!gameOn) {
            message.channel
                .send(
                    `Welcome to the Werewolf Game! Press the controller to join. Set the roles using "setRoles". Then the host can press the green circle to start.`
                )
                .then((message) => {
                    message.react(emoteJoin).then(() => message.react(emoteStart));

                    message
                        .awaitReactions((reaction, user) => reaction.emoji.name === emoteStart && !user.bot && user.id === hostId, {
                            max: 1,
                            time: 300000,
                            errors: ["time"],
                        })
                        .then((collected) => {
                            const reaction = collected.first();

                            if (reaction.emoji.name === emoteStart) {
                                reaction.message.delete();
                                message.channel.send(`Game start! Players: ${players}`);

                                //assigning roles
                                assignRoles(players);

                                //send roles to each player
                                message.channel.send(`Please check your pm for your role. Game starting in ${killTime / 1000}s`);
                                players.forEach((player) => {
                                    if (player.role === "Werewolf") {
                                        player.send(`Your role is...${player.role}! And ${getTeammate(players, player)}`);
                                    } else {
                                        player.send(`Your role is...${player.role}!`);
                                    }
                                });

                                //First night
                                timer = setTimeout(function () {
                                    message.channel.send(`First night. Werewolves! Check your dm to select a player to kill`);
                                    players.forEach((player) => {
                                        if (player.role === "Werewolf") {
                                            player
                                                .send(
                                                    `Select the player that you would like to kill. (Timer: ${
                                                        killTime / 1000
                                                    }s) + ${playerOptions()}`
                                                )
                                                .then((dm) => {
                                                    for (let i = 0; i < players.length; i++) {
                                                        dm.react(emoteKeycaps[i]);
                                                    }
                                                });
                                        }
                                    });
                                }, killTime);

                                //gather who got voted
                            }
                        })
                        .catch((collected) => {
                            console.log("Time out. No action after 5mins");
                            console.log("game terminated");
                            gameOn = false;
                            players = [];
                            message.channel.send("Time out. Game terminated.");
                        });
                })
                .catch((error) => {
                    console.log(error);
                    gameOn = false;
                });
            gameOn = true;
        } else {
            message.channel.send("A game already exists. Type -stop to terminate current session.");
        }
    } else if (message.content === `${prefix}players`) {
        console.log(players.map((player) => player.username));
        if (players.length) {
            message.channel.send(players.map((player) => player.username));
        } else {
            message.channel.send("No players.");
        }
    } else if (message.content === `${prefix}stop`) {
        //TODO: add a confirm reaction check
        console.log("game terminated");
        gameOn = false;
        players = [];
        message.channel.send("Game terminated.");
        clearTimeout(timer);
    } else if (message.content === `${prefix}showRoles`) {
        console.log(roles);
        if (gameOn) {
            message.channel.send(makeRolesArray(roles));
        } else {
            console.log("No existing game. Start a game to use this function");
        }
    } else if (message.content === `${prefix}playerRoles`) {
        if (gameOn) {
            if (players[0].role) {
                //players.map((player) => message.channel.send(`${player.username}'s role is...${player.role}`));
                console.log(players.forEach((player) => message.channel.send(`${player.username}'s role is...${player.role}`)));
            } else {
                message.channel.send("Players roles haven't been set yet. Start the game to assign roles");
            }
        } else {
            console.log("No existing game. Start a game to use this function");
        }
    } else if (message.content.startsWith(`${prefix}setRoles`)) {
        let args = message.content.slice(`${prefix}setRoles`.length + 1).split(" ");
        //console.log(args);

        //use args to set each role
        roles.Werewolf = parseInt(args[0]);
        roles.Villager = parseInt(args[1]);
        roles.Seer = parseInt(args[2]);
        //do the same for the rest of the roles

        message.channel.send(`Werewolves: ${roles.Werewolf}, Villagers: ${roles.Villager} have been set.`);
        console.log(makeRolesArray(roles));
    }
});

client.on("messageReactionAdd", (reaction, user) => {
    if (reaction.emoji.name === emoteJoin && !user.bot) {
        console.log(`${user.username} was added. id: ${user.id}`);
        players.push(user);
    } else if (reaction.emoji.name === emoteThumb && !user.bot) {
        console.log("Reaction get!");
        // setTimeout(function () {
        //     console.log("I appear after 3s!");
        // }, 3000);
    } else if (emoteKeycaps.includes(reaction.emoji.name) && !user.bot) {
        console.log(`${reaction.emoji.name} got selected`);
    }
});

client.on("messageReactionRemove", (reaction, user) => {
    if (reaction.emoji.name === emoteJoin && !user.bot) {
        console.log(`${user.username} was removed`);
        //players.splice(players.indexOf(user.id), 1);
        players.splice(
            players.findIndex((i) => i.id === user.id),
            1
        );
    }
});

client.login(token);
