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

App.SongItemController = Ember.ObjectController.extend({
  needs: 'nowPlaying',

  isPlaying: function () {
    return this.get('model') === this.get('controllers.nowPlaying.model');
  }.property('model', 'controllers.nowPlaying.model')
});

App.AudioPlayerComponent = Ember.Component.extend({
  classNames: 'audio-control',

  duration: null,
  currentTime: 0,
  isLoaded: false,

  didInsertElement: function () {
    var $audio = this.$('audio'),
        component = this;

    $audio
      .on('loadedmetadata', function () {
        component.set('duration', Math.floor(this.duration));
        component.set('isLoaded', true);
      })
      .on('timeupdate', function () {
        component.set('currentTime', Math.floor(this.currentTime));
      })
      .on('play', function () {
        component.set('isPlaying', true);
      })
      .on('pause', function () {
        component.set('isPlaying', false);
      });
  },

  actions: {
    pause: function () {
      this.$('audio')[0].pause();
    },

    play: function () {
      this.$('audio')[0].play();
    }
  }
});

App.SongDurationComponent = Ember.Component.extend({
  showingRemaining: false,

  remaining: function () {
    return this.get('duration') - this.get('current');
  }.property('current', 'duration'),

  click: function () {
    this.toggleProperty('showingRemaining');
  }
});

})();
