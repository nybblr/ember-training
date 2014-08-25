(function() {
"use strict";

Ember.Handlebars.helper('format-duration', function (value) {
  var minutes = Math.floor(value / 60);
  var seconds = value % 60;

  var duration = "";
  duration += minutes;
  duration += ":";
  if (seconds < 10) {
    duration += "0";
  }
  duration += seconds;

  return duration;
});

window.App = Ember.Application.create();

App.Router.map(function () {
  this.resource('album', { path: '/album/:album_id' })
});

App.ApplicationRoute = Ember.Route.extend({
  actions: {
    play: function (song) {
      this.controllerFor('nowPlaying').set('model', song);
    }
  }
});

App.Album = Ember.Object.extend({
  totalDuration: function () {
    return this.get('songs').reduce(function (sum, song) {
      return sum + song.duration;
    }, 0);
  }.property('songs.@each.duration')
});

App.Song = Ember.Object.extend();

App.IndexRoute = Ember.Route.extend({
  model: function () {
    return App.ALBUM_FIXTURES;
  }
});

App.AlbumRoute = Ember.Route.extend({
  model: function (params) {
    return App.ALBUM_FIXTURES.findProperty('id', params.album_id);
  }
});

App.NowPlayingController = Ember.ObjectController.extend();

App.AudioPlayerComponent = Ember.Component.extend({
  classNames: 'audio-control'
});

})();
