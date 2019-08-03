/* 
Copyright 2018 Jason Nelson (@iamcarbon)
Free to use and modify under the MIT licence.
You must not remove this notice.
*/

// Depends on Carbon.Reactive

module Carbon {
  export class Slider {
    element: HTMLElement;
    trackEl: HTMLElement;
    handleEl: HTMLElement;
    options: any;

    listeners: Observer[] = [];

    _value: number;
    step: number;
    scale: LinearScale;

    axis: string;
    last: number;
    snap = false;
    position: number;
    frameRequest: any;

    constructor(element: HTMLElement | string, options) {
      if (typeof element === 'string') {
        element = <HTMLElement>document.querySelector(element);
      }

      this.element = element;
      this.options = options || {};
      this.trackEl = this.element.querySelector('.track') || this.element;
      this.handleEl = this.element.querySelector('.handle');

      this.trackEl.addEventListener('mousedown', this.startDrag.bind(this), true);
    
      if (Carbon.Reactive) {
        this.reactive = new Carbon.Reactive();
      }

      this.options = options || { };

      // attributes...
      let value = this.element.getAttribute('value');
      let min = this.element.getAttribute('min');
      let max = this.element.getAttribute('max');
      let step = this.element.getAttribute('step');
      
      if (value && this.options.value === undefined) {
        this.options.value = Number.parseFloat(value);
      }

      if (step && this.options.step === undefined) {
        this.options.step = Number.parseFloat(step);
      }

      if (min && max && this.options.range === undefined) {
        this.options.range = [ Number.parseFloat(min), Number.parseFloat(max) ];
      }
      
      this.scale = new LinearScale(this.options.range || [ 0, 1 ]);

      this.step = this.options.step || null;     
      this.snap = this.options.snap || false;     

      this.axis = this.options.axis || 'x';
      this.value = this.options.value || this.scale.range[0];
    }
    
    on(type, callback) {
      // start
      // change
      // end

      if (!this.reactive) return null;

      return this.reactive.on(type, callback);
    }

    off(type) {
      this.reactive && this.reactive.off(type);
    }

    startDrag(e: MouseEvent) {

      this.handleEl.style.transition = null;

      // ensure it was a right click
      if (e.which == 3) return;

      e.preventDefault();
      e.stopPropagation();

      if (this.options.handle) {
        if (typeof this.options.handle == 'string') {
          if (!e.target.matches(this.options.handle)) {
            return;
          }
        }
        else if (e.target !== this.options.handle) {
          return;
        }       
      }
      
      this.element.classList.add('active');

      this.onDrag(e);
      
      this.listeners.push(
        new Observer(document, 'mousemove', this.onDrag.bind(this), true),
        new Observer(document, 'mouseup', this.endDrag.bind(this), true)
      );

      this.trigger('start', { target: e.target });
    }

   

    get value() {
      return this._value;
    }

    set value(value: number) {
      this._value = value;

      let scale = _.clamp(this.scale.getScale(value), 0, 1);
      
      this.element.setAttribute('value', value.toString());

      this.setHandlePosition(scale);
    }

    onDrag(e: MouseEvent) {
      let position = this.axis == 'x'
        ? _.getRelativePositionX(e.pageX, this.trackEl)  // x
        : _.getRelativePositionY(e.pageY, this.trackEl); // y

      var value = this.scale.getValue(position);
      var actualPosition = position;

      if (this.step) {
        let before = value;

        value = Math.round(value / this.step) * this.step;

        value = Math.round(value * 1000) / 1000; // 3 decimal places

        // document.querySelector('.debug').innerHTML = (Math.round(before * 1000) / 1000) + ' ' + value + ' ' + this.step);

        position = this.scale.getScale(value);
      }

      if (this.snap) {
        this.setHandlePosition(position);
      }
      else {
        this.setHandlePosition(actualPosition);
      }
      
      this._value = value;

      this.element.setAttribute('value', value.toString());

      if (this.last !== value) {
        this.trigger('change', { position: position, value });
      }
      
      this.last = value;
      
      this.position = position;
    }

    endDrag(e: MouseEvent) {
      this.element.classList.remove('active');
      
      e.preventDefault();
      e.stopPropagation();
      
      this.onDrag(e);

      

      this.handleEl.style.transition = 'left 50ms ease-out, top 50ms ease-out';
      this.setHandlePosition(this.position);
     

      while (this.listeners.length > 0) {
        this.listeners.pop().stop();
      }

      this.trigger('end', { value: this.value });
    }
    
    setHandlePosition(position: number) {
      this.frameRequest && window.cancelAnimationFrame(this.frameRequest);

      this.frameRequest = window.requestAnimationFrame(() => {
        this.frameRequest = null;
        
        this.handleEl.style[this.axis == 'x' ? 'left' : 'top'] = (position * 100) + '%';
      });
    }

    private trigger(type, data) {
      this.reactive && this.reactive.trigger(type, data);
    }
  }

  class LinearScale {
    domain: Array<number>;
    range: Array<number>;

    constructor(domain: Array<number>) {
      this.domain = domain || [ 0, 1 ];
      this.range = [ 0, 1 ]; // Always 0-1
    }

    getScale(value: number) : number {
      return this.range[0] + (this.range[1] - this.range[0]) * ((value - this.domain[0]) / (this.domain[1] - this.domain[0]))
    }

    getValue(value: number) : number {
      // TODO: Support range

      let lower = this.domain[0];
      let upper = this.domain[1];

      let dif = upper - lower;

      return lower + (value * dif);
    }
  }

  let _ = {
    clamp(value: number, min: number, max: number): number {
      if (value < min) return min;

      if (value > max) return max;

      return value;
    },

    getRelativePositionX(x: number, relativeElement: HTMLElement) {
      return Math.max(0, Math.min(1, (x - this.findPosX(relativeElement)) / relativeElement.offsetWidth));
    },

    getRelativePositionY(y: number, relativeElement: HTMLElement) {
      return Math.max(0, Math.min(1, (y - this.findPosY(relativeElement)) / relativeElement.offsetHeight));
    },

    findPosX(element: HTMLElement) {
      var cur = element.offsetLeft;

      while ((element = <HTMLElement>element.offsetParent)) {
        cur += element.offsetLeft;
      }

      return cur;
    },

    findPosY(element: HTMLElement) {
      var cur = element.offsetTop;

      while ((element = <HTMLElement>element.offsetParent)) {
        cur += element.offsetTop;
      }

      return cur;
    }
  };
  
  class Observer {
    constructor(public element: Element | Document, public type, public handler, public useCapture = false) {
      this.element.addEventListener(type, handler, useCapture);
    }
     
    stop() {
      this.element.removeEventListener(this.type, this.handler, this.useCapture)
    }
  }
}