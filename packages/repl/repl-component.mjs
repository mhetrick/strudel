import { getDrawContext, silence } from '@strudel/core';
import { transpiler } from '@strudel/transpiler';
import { getAudioContext, webaudioOutput } from '@strudel/webaudio';
import { StrudelMirror, codemirrorSettings } from '@strudel/codemirror';
import { prebake } from './prebake.mjs';

if (typeof HTMLElement !== 'undefined') {
  class StrudelRepl extends HTMLElement {
    static observedAttributes = ['code'];
    settings = codemirrorSettings.get();
    editor = null;
    constructor() {
      super();
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'code') {
        this.code = newValue;
        this.editor?.setCode(newValue);
      }
    }
    connectedCallback() {
      // setTimeout makes sure the dom is ready
      setTimeout(() => {
        const code = (this.innerHTML + '').replace('<!--', '').replace('-->', '').trim();
        if (code) {
          // use comment code in element body if present
          this.setAttribute('code', code);
        }
      });
      // use a separate container for the editor, to make sure the innerHTML stays as is
      const container = document.createElement('div');
      this.parentElement.insertBefore(container, this.nextSibling);
      const drawContext = getDrawContext();
      const drawTime = [-2, 2];
      this.editor = new StrudelMirror({
        defaultOutput: webaudioOutput,
        getTime: () => getAudioContext().currentTime,
        transpiler,
        root: container,
        initialCode: '// LOADING',
        pattern: silence,
        drawTime,
        onDraw: (haps, time, frame, painters) => {
          painters.length && drawContext.clearRect(0, 0, drawContext.canvas.width * 2, drawContext.canvas.height * 2);
          painters?.forEach((painter) => {
            // ctx time haps drawTime paintOptions
            painter(drawContext, time, haps, drawTime, { clear: false });
          });
        },
        prebake,
        afterEval: ({ code }) => {
          // window.location.hash = '#' + code2hash(code);
        },
        onUpdateState: (state) => {
          const event = new CustomEvent('update', {
            detail: state,
          });
          this.dispatchEvent(event);
        },
      });
      // init settings
      this.editor.updateSettings(this.settings);
      this.editor.setCode(this.code);
    }
    // Element functionality written in here
  }

  customElements.define('strudel-editor', StrudelRepl);
}
