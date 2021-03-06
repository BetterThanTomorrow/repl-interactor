# This repo is archived for now

As we do not have the ability to maintain and pursue the goals of this project we have moved the code into the [Calva](https://github.com/BetterThanTomorrow/calva) repository for now.


Below is the old description. For anyone wondering what the goals of the project might have been.


## Description

This repo contains a prototype HTML5 REPL control, currently supporting syntax highlighting, selection, keyboard navigation and clipboard support.

Ultimately it is intended to be a general presentation stream REPL interactor, in the vein of CLIM, Symbolics Open Genera, with a modern twist. It is not directly tied to any language, so eventually it should be portable to any language you fancy, including ECMAScript.

## Demo

You can see a demo of what I have so far [here](https://repl-interactor.netlify.com/).

## Understanding Presentation Streams

Consider what happens if you `println` a URL. As far as the underlying `stdout` stream is concerned, it is merely a sequence of characters. Some terminals are smarter than others, and may use a regular expression to detect URLs. In these terminals you can
click on said URL and visit it.  This is naturally error prone, and it's unclear how to handle the general case, perhaps you are printing a customer id, or a reference to some database row.

The unix shell has similar issues- the command `ls -la` merely prints a sequence of characters to the stream. Individual shell commands know what *they* are printing, but the next command in a pipe just recieves a series of strings, and has to rederive the
semantics.

A *presentation stream* is a regular stream much like stdout/stdin, but it maintains the *semantics* of the underlying object. That is, you can push *any* kind of data through it, and it is still possible to recover a reference to the underlying data structure, which you can use to drill into the object, re-insert it into a new command, etc.

## Purpose

[Calva](https://github.com/BetterThanTomorrow/calva) doesn't currently support a dedicated REPL display, but uses the builtin VSCode terminal. With exciting new features in Clojure 1.10, such as `datafy` and `nav`, it is now possible to build rich inspectors in Clojure, in the vein of [CLIM](http://web.archive.org/web/20120707045546/http://www.mikemac.com:80/mikemac/clim/cover.html).

This support can be handled via a REPL client (eventually, this) and a custom presentation stream library running in the host program, which communicates to it. In fact, with just `datafy` and `nav`, it should be possible to go a long way.

Sadly, VSCode's editor does not support rich HTML embedded in a `vscode.TextDocument`, but the abilty to display interactive graphs, tables, etc. at the REPL is too tempting to pass by.  Fortunately VSCode *does* support `WebView`, which allows us to have an embedded html view, we need to re-build a syntax highlighting editor, undo/redo support etc from the ground up, which is just a [small matter of programming](http://www.catb.org/jargon/html/S/SMOP.html).

## Caveat

This is still rather an experiment- since we are an isolated web page within vscode, we don't have access to other extension behaviour. Perhaps long term this will make the project unviable, but for now, it's worth experimenting.

Currently I am still fleshing out the low-level details, it's basically a syntax highlighting readline with all the trimmings you'd expect from modern software (undo management, clipboard, selection, etc)s.

## Why TypeScript?

This project is intended for use first off for Calva, however the goal is to generally be useful for anyone. Using TypeScript keeps the bundle size down (< 8k gzipped for now), and makes the code generally more accessible for those wanting to add a REPL to their favorite language.

## Goals

* A reusable (not tied to VSCode/Calva) html REPL.
* High performance
* Auto indent
* Paredit
* Completions
* Customizable presentation types

## Status

- [x] Insert / Delete text
- [x] Keyboard navigation
- [x] Mouse navigation
- [x] Selection
- [x] Clipboard support
- [x] Undo / Redo
- [x] Paren matching
- [x] Auto-indent clojure code
- [x] Paredit
- [ ] Completions
- [ ] Presentation layer

## Trying it out

First, clone this repository, and from within the directory:

`$ npm i`

`$ npm run dev`

Now point your browser at `http://localhost:8080` and type away. The REPL is not yet connected, it is effectively a dumb terminal with syntax highlighting for now.

Copyright (C) 2019 Matt Seddon / BetterThanTomorrow
