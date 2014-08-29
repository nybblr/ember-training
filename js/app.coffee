"use strict"

modulo = (a, b) -> (a % b + +b) % b

Ember.Handlebars.helper 'format-duration', (value) ->
  minutes = Math.floor(value / 60)
  seconds = value % 60

  duration = ""
  duration += minutes
  duration += ":"
  duration += "0" if seconds < 10
  duration += seconds

  duration

window.App = Ember.Application.create()

App.ShortcutsMixin = Ember.Mixin.create
  activate: ->
    @_super()
    @_shortcutCallbacks = {}
    self = this
    shortcuts = @shortcuts
    for shortcut of shortcuts
      action = shortcuts[shortcut]
      callback = do (shortcut, action) ->
        (event) ->
          action.apply(self, event)
          return
      @_shortcutCallbacks[shortcut] = callback
      Mousetrap.bind(shortcut, callback)
    return

  deactivate: ->
    @_super()
    shortcuts = @_shortcutCallbacks
    for shortcut of shortcuts
      callback = shortcuts[shortcut]
      Mousetrap.unbind(shortcut, callback)
    @_shortcutCallbacks = {}
    return

Ember.Route.reopen(App.ShortcutsMixin)

App.Router.map ->
  @resource 'album', path: '/album/:album_id'
  return

App.ApplicationRoute = Ember.Route.extend
  shortcuts:
    space: ->
      event.preventDefault()
      @send('togglePlaying')
      return
    down: ->
      event.preventDefault()
      @controllerFor('nowPlaying').send('nextSong')
      return

  actions:
    play: (song) ->
      nowPlaying = @controllerFor('nowPlaying')
      nowPlaying.resetQueue()
      @send('playLater', song)
      return
    playLater: (song) ->
      @controllerFor('nowPlaying').send('enqueue', song)
      return
    togglePlaying: ->
      @controllerFor('nowPlaying').send('togglePlaying')
      return

songsDuration = (songs) ->
  songs.reduce (sum, song) ->
    sum + song.duration
  , 0

App.Album = Ember.Object.extend
  totalDuration: (->
    songsDuration @get('songs')
  ).property('songs.@each.duration')

App.Song = Ember.Object.extend()

App.IndexRoute = Ember.Route.extend
  model: ->
    App.ALBUM_FIXTURES

App.AlbumRoute = Ember.Route.extend
  shortcuts:
    esc: ->
      event.preventDefault()
      @transitionTo('application')
      return
    left: ->
      event.preventDefault()
      @send('prevAlbum')
      return
    right: ->
      event.preventDefault()
      @send('nextAlbum')
      return

  model: (params) ->
    @albumList().findProperty('id', params.album_id)

  albumList: ->
    App.ALBUM_FIXTURES

  _currentIndex: (album) ->
    @albumList().indexOf(@currentModel)

  _stepIndex: (index, step) ->
    modulo (index + step), @albumList().length

  _stepAlbum: (step) ->
    index = @_stepIndex(@_currentIndex(), step)
    @albumList()[index]

  actions:
    prevAlbum: ->
      @transitionTo('album', @_stepAlbum(-1))
      return
    nextAlbum: ->
      @transitionTo('album', @_stepAlbum(1))
      return

App.AlbumListingController = Ember.ArrayController.extend
  totalDuration: (->
    songsDuration(@get('model'))
  ).property('model.@each.duration')

App.NowPlayingController = Ember.ObjectController.extend
  showQueue: false
  isPlaying: false

  init: ->
    @set('queue', [])
    return

  queueChanged: (->
    @set('model', @get('queue')[0])
  ).observes('queue.@each')

  enqueueSong: (song) ->
    @get('queue').pushObject(song)
    return

  dequeueSong: ->
    @get('queue').shiftObject()

  resetQueue: ->
    @get('queue').clear()
    return

  actions:
    enqueue: (song) ->
      @enqueueSong(song)
      return
    nextSong: ->
      @dequeueSong()
      return
    toggleQueue: ->
      @toggleProperty('showQueue')
      return
    togglePlaying: ->
      @toggleProperty('isPlaying')
      return

App.SongItemController = Ember.ObjectController.extend
  needs: 'nowPlaying'

  isPlaying: (->
    @get('model') is @get('controllers.nowPlaying.model')
  ).property('model', 'controllers.nowPlaying.model')

App.QueueController = Ember.ArrayController.extend
  needs: 'nowPlaying'

  isVisible: Ember.computed.alias('controllers.nowPlaying.showQueue')

  model: Ember.computed.alias('controllers.nowPlaying.queue')

App.AudioPlayerComponent = Ember.Component.extend
  classNames: 'audio-control'

  duration: null
  currentTime: 0
  isLoaded: false
  isPlaying: false

  isPlayingChanged: (->
    if @get('isPlaying')
      @send('play')
    else
      @send('pause')
    return
  ).observes('isPlaying')

  didInsertElement: ->
    $audio = @$('audio')
    component = this

    $audio.on 'loadedmetadata', ->
      component.set('duration', Math.floor(@duration))
      component.set('isLoaded', true)
      return
    $audio.on 'timeupdate', ->
      component.set('currentTime', Math.floor(@currentTime))
      return
    $audio.on 'play', ->
      component.set('isPlaying', true)
      return
    $audio.on 'pause', ->
      component.set('isPlaying', false)
      return
    $audio.on 'ended', ->
      component.set('isPlaying', false)
      component.sendAction('ended')
      return

    return

  actions:
    pause: ->
      @$('audio')[0].pause()
      return
    play: ->
      @$('audio')[0].play()
      return

App.SongDurationComponent = Ember.Component.extend
  showingRemaining: false

  remaining: (->
    @get('duration') - @get('current')
  ).property('current', 'duration')

  click: ->
    @toggleProperty('showingRemaining')
    return
