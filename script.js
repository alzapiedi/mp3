#! /usr/bin/env node

const fs = require('fs');
const superagent = require('superagent');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const PATH = '/Users/nick/Desktop';
let query = process.argv.slice(2).join(' ');
const debug = query.indexOf('-d') > -1;
const lucky = query.indexOf('-l') > -1;
const video = query.indexOf('-v') > -1;
query = query.replace('-d', '');
query = query.replace('-l', '');
query = query.replace('-v', '');

function validate() {
  const t = +new Date();
  return superagent.get(`https://mp3skulls.to/search/youtube//validate?_=${t}`).then(log).then(res => res.body);
}

function search(query, params) {
  const { hash, enc, time } = params;
  const urlHash = Buffer.from(hash + enc + time).toString('base64');
  const urlQuery = encodeURIComponent(query);

  return superagent.get(`https://mp3skulls.to/search/youtube/?q=${urlQuery}&hash=${urlHash}`).set('host', 'mp3skulls.to').set('referer', 'https://mp3skulls.to').then(log).then(res => res.body.items);
}

function getDownloadUrl(item) {
  const t = +new Date();
  return superagent.get(`https://mp3skulls.to/api-01/downloader/state?id=${encodeURIComponent(item.id)}&_=${t}`).then(log).then(res => {
    if (res.body.status === 'error') throw new Error('Unknown error, try different download');
    if (res.body.status !== 'finished') return getDownloadUrl(item);
    return res.body;
  });
}

function getUserInput(items) {
  if (lucky) return Promise.resolve(items[0]);
  return new Promise((resolve, reject) => {
    items.forEach((item, index) => {
      console.log(`${index + 1} - ${item.title}`)
    });
    rl.on('line', (input) => {
      console.log('Finding download URL...')
      resolve(items[parseInt(input) - 1]);
    });
  });
}

function download(data) {
  const { filenameMusic, filenameVideo, dlMusic, dlVideo } = data;
  const stream = fs.createWriteStream(`${PATH}/music/${video ? filenameVideo :filenameMusic}`);
  console.log('Starting download');
  stream.on('finish', () => {
    rl.close();
    console.log('Download complete');
  });

  return superagent.get(video ? encodeURI(dlVideo) : encodeURI(dlMusic)).pipe(stream);
}

function log(response) {
  if (debug) console.log(JSON.stringify(response.body));
  return response;
}

function error(error) {
  rl.close();
  console.log('An error occurred: ' + error.message);
}

validate().then(params => search(query, params)).then(items => getUserInput(items)).then(getDownloadUrl).then(download).catch(error);
