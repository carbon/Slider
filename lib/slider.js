"use strict";
var Carbon;
(function (Carbon) {
    class Slider {
        constructor(element, options) {
            this.listeners = [];
            this.snap = false;
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            this.element = element;
            this.options = options || {};
            this.trackEl = this.element.querySelector('.track') || this.element;
            this.handleEl = this.element.querySelector('.handle');
            this.trackEl.addEventListener('mousedown', this.startDrag.bind(this), true);
            if (Carbon.Reactive) {
                this.reactive = new Carbon.Reactive();
            }
            this.options = options || {};
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
                this.options.range = [Number.parseFloat(min), Number.parseFloat(max)];
            }
            this.scale = new LinearScale(this.options.range || [0, 1]);
            this.step = this.options.step || null;
            this.snap = this.options.snap || false;
            this.axis = this.options.axis || 'x';
            this.value = this.options.value || this.scale.range[0];
        }
        on(type, callback) {
            if (!this.reactive)
                return null;
            return this.reactive.on(type, callback);
        }
        off(type) {
            this.reactive && this.reactive.off(type);
        }
        startDrag(e) {
            this.handleEl.style.transition = null;
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
        get value() {
            return this._value;
        }
        set value(value) {
            this._value = value;
            let scale = _.clamp(this.scale.getScale(value), 0, 1);
            this.element.setAttribute('value', value.toString());
            this.setHandlePosition(scale);
        }
        onDrag(e) {
            let position = this.axis == 'x'
                ? _.getRelativePositionX(e.pageX, this.trackEl)
                : _.getRelativePositionY(e.pageY, this.trackEl);
            var value = this.scale.getValue(position);
            var actualPosition = position;
            if (this.step) {
                let before = value;
                value = Math.round(value / this.step) * this.step;
                value = Math.round(value * 1000) / 1000;
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
        endDrag(e) {
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
        setHandlePosition(position) {
            this.frameRequest && window.cancelAnimationFrame(this.frameRequest);
            this.frameRequest = window.requestAnimationFrame(() => {
                this.frameRequest = null;
                this.handleEl.style[this.axis == 'x' ? 'left' : 'top'] = (position * 100) + '%';
            });
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
        getValue(value) {
            let lower = this.domain[0];
            let upper = this.domain[1];
            let dif = upper - lower;
            return lower + (value * dif);
        }
    }
    let _ = {
        clamp(value, min, max) {
            if (value < min)
                return min;
            if (value > max)
                return max;
            return value;
        },
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
