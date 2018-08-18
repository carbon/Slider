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

    constructor(element: HTMLElement, options) {
      this.element = element;
      this.options = options || {};
      this.trackEl = this.element.querySelector('.track') || this.element;
      this.handleEl = this.element.querySelector('.nub, .handle');

      this.trackEl.addEventListener('mousedown', this.startDrag.bind(this), true);
    
      if (Carbon.Reactive) {
        this.reactive = new Carbon.Reactive();
      }

      this.options = options || { };

      this.scale = new LinearScale(this.options.range || [ 0, 1 ]);

      this.step = this.options.step || null;

      this._value = this.scale.getValue(0);

      this.axis = this.options.axis || 'x';
    }
    
    on(type, callback) {
      // start
      // change
      // end

      if (!this.reactive) return;

      return this.reactive.on(type, callback);
    }

    off(type) {
      this.reactive && this.reactive.off(type);
    }

    startDrag(e: MouseEvent) {
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

    endDrag(e) {
      this.element.classList.remove('active');
      
      e.preventDefault();
      e.stopPropagation();
      
      this.onDrag(e);
      
      while (this.listeners.length > 0) {
        this.listeners.pop().stop();
      }

      this.trigger('end', { value: this.value });
    }

    get value() {
      return this._value;
    }

    set value(value: number) {
      this._value = value;

      let scale = _.clamp(this.scale.getScale(value), 0, 1);

      this.setHandlePosition(scale);
    }

    onDrag(e: MouseEvent) {
      let position = this.axis == 'x'
        ? _.getRelativePositionX(e.pageX, this.trackEl)  // x
        : _.getRelativePositionY(e.pageY, this.trackEl); // y

      var value = this.scale.getValue(position);
      var scale = position;

      if (this.step) {
        value = Math.round(value / this.step) * this.step;

        scale = this.scale.getScale(value);
      }

      this.setHandlePosition(scale);
      
      this._value = value;

      this.trigger('change', { position: position, value });
    }

    setHandlePosition(position: number) {
      this.handleEl.style[this.axis == 'x' ? 'left' : 'top'] = (position * 100) + '%';
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

    clamp(value: number, min: number, max: number): number {
      if (value < min) return min;

      if (value > max) return max;

      return value;
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