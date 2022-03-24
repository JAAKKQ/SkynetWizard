const fs = require('fs');
const readline = require('readline');
var path = require('path');
var RootFolder = path.resolve("./");
const extract = require('extract-zip');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const { SkynetClient } = require('@skynetlabs/skynet-nodejs');
const { start } = require('repl');
const client = new SkynetClient();

//Achive the file(s) or folder(s)
function AchiveFile(srcDir, cb) {
    var fs = require('fs');
    var archiver = require('archiver');

    var output = fs.createWriteStream(`cache.zip`);
    var archive = archiver('zip');

    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('Archiver has been finalized and the output file descriptor has closed.');
        cb();
    });
    archive.on('error', function (err) {
        throw err;
    });

    archive.pipe(output);

    // append files from a sub-directory, putting its contents at the root of archive
    if (fs.lstatSync(srcDir).isDirectory()) {
        archive.directory(srcDir, false);
    } else {
        archive.file(srcDir, false);
    };

    // append files from a sub-directory and naming it `new-subdir` within the archive

    archive.directory('subdir/', 'new-subdir');
    archive.finalize();
}

module.exports = function (init) {
    init = init;

    return {
        upload: function (LocalDir, cb) {
            AchiveFile(LocalDir, function () {
                (async () => {
                    const url = await client.uploadFile(RootFolder + '/cache.zip');
                    cb(url);
                })();
            });
        },
        download: function (InternetDir, cb) {
            (async () => {
                const skylink = InternetDir;
                await client.downloadFile("data.zip", skylink);
                await extract("data.zip", { dir: path.resolve('.') })
                console.log('Download successful');
            })();
        },
        start: function () {
            StartWizard();
        }
    }
};

function StartWizard() {
    console.log('\x1b[32m%s\x1b[0m', '--------------/ Welcome to the dungeon! \--------------');
    rl.question('Upload or download? u/d: ', function (result) {
        if (result === 'u') {
            rl.question('What file or directory do you want to upload to The Internet: ', function (LocalDir) {
                if (fs.existsSync(LocalDir)) {
                    console.log('Starting uploading...');
                    AchiveFile(LocalDir, function () {
                        (async () => {
                            const url = await client.uploadFile(RootFolder + '/cache.zip');
                            console.log(`Upload successful!`);
                            console.log('\x1b[32m%s\x1b[0m', `URL: ${url}`);
                            StartWizard();
                        })();
                    });
                } else {
                    console.log('File or directory does not exist!');
                    StartWizard();
                }
            });
        } else {
            rl.question('Enter the SIA URL: sia://', function (InternetDir) {
                rl.question('Where would you like to save this file?', function (Dest) {
                    (async () => {
                        const skylink = InternetDir;
                        await client.downloadFile("data.zip", skylink);
                        console.log('Download successful');
                        await extract("data.zip", { dir: path.resolve(Dest) })
                        console.log('Extraction complete');
                        StartWizard();
                    })();
                });
            });
        }
    });
}