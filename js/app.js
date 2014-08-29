(function() {
  "use strict";

  var modulo = function (a, b) {
    return (a % b + +b) % b;
  };

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

  App.ShortcutsMixin = Ember.Mixin.create({
    activate: function () {
      this._super();
      this._shortcutCallbacks = {};
      var self = this;
      var shortcuts = this.shortcuts;
      for (var shortcut in shortcuts) {
        var action = shortcuts[shortcut];
        var callback = (function (shortcut, action) {
          return function (event) {
            action.apply(self, event);
          };
        })(shortcut, action);
        this._shortcutCallbacks[shortcut] = callback;
        Mousetrap.bind(shortcut, callback);
      }
    },
    deactivate: function () {
      this._super();
      var shortcuts = this._shortcutCallbacks;
      for (var shortcut in shortcuts) {
        var callback = shortcuts[shortcut];
        Mousetrap.unbind(shortcut, callback);
      }
      this._shortcutCallbacks = {};
    }
  });

  Ember.Route.reopen(App.ShortcutsMixin);

  App.Router.map(function () {
    this.resource('album', { path: '/album/:album_id' })
  });

  App.ApplicationRoute = Ember.Route.extend({
    shortcuts: {
      space: function () {
        event.preventDefault();
        this.send('togglePlaying');
      },
      down: function () {
        event.preventDefault();
        this.controllerFor('nowPlaying').send('nextSong');
      }
    },

    actions: {
      play: function (song) {
        var nowPlaying = this.controllerFor('nowPlaying');
        nowPlaying.resetQueue();
        this.send('playLater', song);
      },
      playLater: function (song) {
        this.controllerFor('nowPlaying').send('enqueue', song);
      },
      togglePlaying: function () {
        this.controllerFor('nowPlaying').send('togglePlaying');
      }
    }
  });

  var songsDuration = function (songs) {
    return songs.reduce(function (sum, song) {
      return sum + song.duration;
    }, 0);
  };

  App.Album = Ember.Object.extend({
    totalDuration: function () {
      return songsDuration(this.get('songs'));
    }.property('songs.@each.duration')
  });

  App.Song = Ember.Object.extend();

  App.IndexRoute = Ember.Route.extend({
    model: function () {
      return App.ALBUM_FIXTURES;
    }
  });

  App.AlbumRoute = Ember.Route.extend({
    shortcuts: {
      esc: function () {
        event.preventDefault();
        this.transitionTo('application');
      },
      left: function () {
        event.preventDefault();
        this.send('prevAlbum');
      },
      right: function () {
        event.preventDefault();
        this.send('nextAlbum');
      }
    },

    model: function (params) {
      return this.albumList().findProperty('id', params.album_id);
    },

    albumList: function () {
      return App.ALBUM_FIXTURES;
    },

    _currentIndex: function (album) {
      return this.albumList().indexOf(this.currentModel);
    },

    _stepIndex: function (index, step) {
      return modulo(index + step, this.albumList().length);
    },

    _stepAlbum: function (step) {
      var index = this._stepIndex(this._currentIndex(), step);
      return this.albumList()[index];
    },

    actions: {
      prevAlbum: function () {
        this.transitionTo('album', this._stepAlbum(-1));
      },
      nextAlbum: function () {
        this.transitionTo('album', this._stepAlbum(1));
      }
    }
  });

  App.AlbumListingController = Ember.ArrayController.extend({
    totalDuration: function () {
      return songsDuration(this.get('model'));
    }.property('model.@each.duration')
  });

  App.NowPlayingController = Ember.ObjectController.extend({
    showQueue: false,
    isPlaying: false,

    init: function () {
      this.set('queue', []);
    },

    queueChanged: function () {
      this.set('model', this.get('queue')[0]);
    }.observes('queue.@each'),

    enqueueSong: function (song) {
      this.get('queue').pushObject(song);
    },

    dequeueSong: function () {
      return this.get('queue').shiftObject();
    },

    resetQueue: function () {
      this.get('queue').clear();
    },

    actions: {
      enqueue: function (song) {
        this.enqueueSong(song);
      },
      nextSong: function () {
        this.dequeueSong();
      },
      toggleQueue: function () {
        this.toggleProperty('showQueue');
      },
      togglePlaying: function () {
        this.toggleProperty('isPlaying');
      }
    }
  });

  App.SongItemController = Ember.ObjectController.extend({
    needs: 'nowPlaying',

    isPlaying: function () {
      return this.get('model') === this.get('controllers.nowPlaying.model');
    }.property('model', 'controllers.nowPlaying.model')
  });

  App.QueueController = Ember.ArrayController.extend({
    needs: 'nowPlaying',

    isVisible: Ember.computed.alias('controllers.nowPlaying.showQueue'),

    model: Ember.computed.alias('controllers.nowPlaying.queue')
  });

  App.AudioPlayerComponent = Ember.Component.extend({
    classNames: 'audio-control',

    duration: null,
    currentTime: 0,
    isLoaded: false,
    isPlaying: false,

    isPlayingChanged: function () {
      if (this.get('isPlaying')) {
        this.send('play');
      } else {
        this.send('pause');
      }
    }.observes('isPlaying'),

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
        })
        .on('ended', function () {
          component.set('isPlaying', false);
          component.sendAction('ended');
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
