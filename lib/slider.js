"use strict";
var Carbon;
(function (Carbon) {
    class Slider {
        constructor(element, options) {
            this.listeners = [];
            this.element = element;
            this.options = options || {};
            this.trackEl = this.element.querySelector('.track') || this.element;
            this.handleEl = this.element.querySelector('.nub, .handle');
            this.trackEl.addEventListener('mousedown', this.startDrag.bind(this), true);
            if (Carbon.Reactive) {
                this.reactive = new Carbon.Reactive();
            }
            this.options = options || {};
            this.scale = new LinearScale(this.options.range || [0, 1]);
            this.step = this.options.step || null;
            this._value = this.scale.getValue(0);
            this.axis = this.options.axis || 'x';
        }
        on(type, callback) {
            if (!this.reactive)
                return;
            return this.reactive.on(type, callback);
        }
        off(type) {
            this.reactive && this.reactive.off(type);
        }
        startDrag(e) {
            if (e.which == 3)
                return;
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
            this.listeners.push(new Observer(document, 'mousemove', this.onDrag.bind(this), true), new Observer(document, 'mouseup', this.endDrag.bind(this), true));
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
        set value(value) {
            this._value = value;
            let scale = _.clamp(this.scale.getScale(value), 0, 1);
            this.setHandlePosition(scale);
        }
        onDrag(e) {
            let position = this.axis == 'x'
                ? _.getRelativePositionX(e.pageX, this.trackEl)
                : _.getRelativePositionY(e.pageY, this.trackEl);
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
        setHandlePosition(position) {
            this.handleEl.style[this.axis == 'x' ? 'left' : 'top'] = (position * 100) + '%';
        }
        trigger(type, data) {
            this.reactive && this.reactive.trigger(type, data);
        }
    }
    Carbon.Slider = Slider;
    class LinearScale {
        constructor(domain) {
            this.domain = domain || [0, 1];
            this.range = [0, 1];
        }
        getScale(value) {
            return this.range[0] + (this.range[1] - this.range[0]) * ((value - this.domain[0]) / (this.domain[1] - this.domain[0]));
        }
        clamp(value, min, max) {
            if (value < min)
                return min;
            if (value > max)
                return max;
            return value;
        }
        getValue(value) {
            let lower = this.domain[0];
            let upper = this.domain[1];
            let dif = upper - lower;
            return lower + (value * dif);
        }
    }
    let _ = {
        getRelativePositionX(x, relativeElement) {
            return Math.max(0, Math.min(1, (x - this.findPosX(relativeElement)) / relativeElement.offsetWidth));
        },
        getRelativePositionY(y, relativeElement) {
            return Math.max(0, Math.min(1, (y - this.findPosY(relativeElement)) / relativeElement.offsetHeight));
        },
        findPosX(element) {
            var cur = element.offsetLeft;
            while ((element = element.offsetParent)) {
                cur += element.offsetLeft;
            }
            return cur;
        },
        findPosY(element) {
            var cur = element.offsetTop;
            while ((element = element.offsetParent)) {
                cur += element.offsetTop;
            }
            return cur;
        }
    };
    class Observer {
        constructor(element, type, handler, useCapture = false) {
            this.element = element;
            this.type = type;
            this.handler = handler;
            this.useCapture = useCapture;
            this.element.addEventListener(type, handler, useCapture);
        }
        stop() {
            this.element.removeEventListener(this.type, this.handler, this.useCapture);
        }
    }
})(Carbon || (Carbon = {}));