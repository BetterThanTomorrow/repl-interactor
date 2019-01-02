# Prototype REPL interface for Calva.

## Description

This repo contains a prototype HTML5 REPL control, currently supporting syntax highlighting, selection, keyboard navigation and clipboard support.

Ultimately it is intended to be a general presentation stream REPL interactor, in the vein of CLIM, Symbolics Open Genera and the earlier MIT CONS and CADR, with a modern twist. It is not directly tied to any language, so eventually it should be portable to any language you fancy, including ECMAScript.

## Presentation What?

You can think of a *presentation stream* as a stream much like stdout/stdin, but supporting rich user interface controls. Not only can you push text through it, you can push *any* data through it, and custom controls that react to that data are created inline to display and edit it.  If you have ever used `Mathematica` or `Gorilla REPL`, you have an idea how this works.

## Purpose

[Calva](https://github.com/BetterThanTomorrow/calva) doesn't currently support a dedicated REPL display, but uses the builtin VSCode terminal. With exciting new features in Clojure 1.10, such as `datafy` and `nav`, it is now possible to build rich inspectors in Clojure
in the vein of [CLIM](http://web.archive.org/web/20120707045546/http://www.mikemac.com:80/mikemac/clim/cover.html).

Sadly, VSCode's editor does not support rich HTML embedded in a `vscode.TextDocument`, but the abilty to display interactive graphs, tables, etc. at the REPL is too tempting to pass by.  Fortunately VSCode *does* support `WebView`, which allows us to have an embedded html view.

Thus, this project was born. It is still rather an experiment- since we are an isolated web page within vscode,
we literally need to re-build a syntax highlighting editor, undo/redo support etc from the ground up.

Currently what we have is a simple console control, but by layering atop this, more shininess can be added.

## Goals

* A reusable (not tied to VSCode/Calva) html REPL.
* High performance
* Auto indent
* Paredit
* Completions
* Customizable presentation types

## Trying it out

The build is fairly trivial, horay.

clone this repository, and from within the directory:

`$ npm i`

`$ npm run dev`

Now point your browser at `http://localhost:8080` and type away. The REPL is not yet connected, it is effectively a dumb terminal with syntax highlighting for now.

Copyright (C) 2019 Matt Seddon / BetterThanTomorrow
