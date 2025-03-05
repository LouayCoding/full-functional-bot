const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const AsciiTable = require('ascii-table');

const table = new AsciiTable().setHeading('Modals', 'Status').setBorder('|', '=', "0", "0");

module.exports = (client) => {
    const modalsPath = path.join(__dirname, '../modals');
    fs.readdirSync(modalsPath).filter(file => file.endsWith('.js')).forEach((file) => {
        const modal = require(path.join(modalsPath, file));
        
        if (modal.id && modal.run) {
            client.modals.set(modal.id, modal);
            table.addRow(modal.id, '✅');
        } else {
            table.addRow(file, '⛔  -> ontbrekende id of run functie');
        }
    });
    console.log(chalk.greenBright(table.toString()));
};
