module.exports = {
    name: 'addSong',
    execute(queue, song) {
        queue.textChannel.send(`Toegevoegd aan de wachtrij: ${song.name} - Aangevraagd door: ${song.user}`);
    },
};
