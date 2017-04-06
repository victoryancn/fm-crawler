/**
 * Created by victor on 2017/4/6.
 */

const Crawler = require('crawler');
const url = require('url');
const request = require('request');
const fs = require('fs-extra');
const forEach = require('async-foreach').forEach;

const c = new Crawler({
  maxConnections: 10,
  callback: function (error, res, done) {
    if (error) {
      console.log(error);
    } else {
      const $ = res.$;
      const courses = [];
      console.log('fetch all courses...');
      $('.title a').each(function (index, item) {
        const href = $(item).attr('href');
        const splitList = href.split('/');
        courses.push('https://api.frontendmasters.com/v1/kabuki/courses/' + splitList[splitList.length - 2]);
      });
      console.log('fetch all courses...done');
      console.log('request video data...');
      const promises = courses.map(function (item) {
        return new Promise(function (resolve, reject) {
          request(item, function (error, response, body) {
            if (error) {
              reject(error)
            }
            resolve(body);
          });
        });
      });
      Promise.all(promises).then(function (videos) {
        console.log('request video data...done');

        fs.ensureDirSync('./download');
        fs.emptyDirSync('./download');
        console.log('start downloading...');

        forEach(videos, function (item) {
          const videosDone = this.async();
          const video = JSON.parse(item);
          const videoPath = './download/' + video.slug;
          fs.ensureFileSync(videoPath + '/video.json');
          fs.writeJsonSync(videoPath + '/video.json', video);
          forEach(video.lessonData, function (lesson) {
            const done = this.async();
            const filepath = videoPath + '/' + lesson.index + '.' + lesson.title + '.mp4';
            console.log('downloading ' + lesson.index + '.' + lesson.title + '.mp4');
            const stream = request({
              url: 'https://api.frontendmasters.com/v1/kabuki/video/' + lesson.statsId + '?r=1080&f=mp4',
            }).pipe(fs.createWriteStream(filepath));
            stream.on('finish', function () {
              done();
            })
          }, function (notAborted, arr) {
            console.log("done", notAborted, arr);
            videosDone();
          });
        })
      })
    }
    done();
  }
});

c.queue('https://frontendmasters.com/courses');


