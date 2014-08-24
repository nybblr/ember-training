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

App.Album = Ember.Object.extend();

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

})();
