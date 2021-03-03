define('client/src/environment',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = {
    debug: true,
    testing: false };
});
define('client/src/elems/form',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.FormCustomAttribute = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _dec2, _class;

  var FormCustomAttribute = exports.FormCustomAttribute = (_dec = (0, _aureliaFramework.bindable)('disabled'), _dec2 = (0, _aureliaFramework.inject)(Element), _dec(_class = _dec2(_class = function () {
    function FormCustomAttribute(element) {
      _classCallCheck(this, FormCustomAttribute);

      this.element = element;
      this.change = this.change.bind(this);
    }

    FormCustomAttribute.prototype.change = function change() {

      if (this.value == 'onchange' && this.serialize() == this.initialValue) return this.inputElement.disabled = true;

      var valid = this.formElement && this.formElement.checkValidity();
      this.inputElement.disabled = !valid;
    };

    FormCustomAttribute.prototype.attached = function attached() {
      this.formElement = this.element.closest('form');
      this.formElement.addEventListener('change', this.debounce(this.change, 150));
      this.formElement.addEventListener('input', this.debounce(this.change, 150));

      this.inputElement = this.element.querySelector('input,button,select') || this.element;

      this.initialValue = this.serialize();

      setTimeout(this.change);
    };

    FormCustomAttribute.prototype.serialize = function serialize() {
      var s = [];
      for (var _iterator = this.formElement.elements, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
          if (_i >= _iterator.length) break;
          _ref = _iterator[_i++];
        } else {
          _i = _iterator.next();
          if (_i.done) break;
          _ref = _i.value;
        }

        var field = _ref;

        if (field.type != 'select-multiple') s.push(field.value);else {
          for (var _iterator2 = field.options, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
            var _ref2;

            if (_isArray2) {
              if (_i2 >= _iterator2.length) break;
              _ref2 = _iterator2[_i2++];
            } else {
              _i2 = _iterator2.next();
              if (_i2.done) break;
              _ref2 = _i2.value;
            }

            var _option = _ref2;

            if (_option.selected) s.push(_option.value);
          }
        }
      }
      return s.join('&');
    };

    FormCustomAttribute.prototype.debounce = function debounce(func, wait) {
      var timeout = void 0;
      return function () {
        var _this = this,
            _arguments = arguments;

        clearTimeout(timeout);
        timeout = setTimeout(function (_) {
          timeout = null;
          func.apply(_this, _arguments);
        }, wait);
      };
    };

    return FormCustomAttribute;
  }()) || _class) || _class);
});
define('client/src/elems/md-autocomplete',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MdAutocompleteCustomElement = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _dec2, _dec3, _class;

  var MdAutocompleteCustomElement = exports.MdAutocompleteCustomElement = (_dec = (0, _aureliaFramework.bindable)({ name: 'value', defaultBindingMode: _aureliaFramework.bindingMode.twoWay }), _dec2 = (0, _aureliaFramework.bindable)('disabled'), _dec3 = (0, _aureliaFramework.bindable)('placeholder'), _dec(_class = _dec2(_class = _dec3(_class = function () {
    function MdAutocompleteCustomElement() {
      _classCallCheck(this, MdAutocompleteCustomElement);
    }

    MdAutocompleteCustomElement.prototype.toggleResults = function toggleResults($event) {
      var _this = this;

      setTimeout(function () {
        return _this.showResults = !_this.showResults;
      }, 200);
    };

    return MdAutocompleteCustomElement;
  }()) || _class) || _class) || _class);
});
define('client/src/elems/md-button',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MdButtonCustomElement = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _class;

  var MdButtonCustomElement = exports.MdButtonCustomElement = (_dec = (0, _aureliaFramework.bindable)('form'), _dec2 = (0, _aureliaFramework.bindable)('class'), _dec3 = (0, _aureliaFramework.bindable)('raised'), _dec4 = (0, _aureliaFramework.bindable)('fab'), _dec5 = (0, _aureliaFramework.bindable)('disabled'), _dec6 = (0, _aureliaFramework.bindable)('color'), _dec7 = (0, _aureliaFramework.inject)(Element), _dec(_class = _dec2(_class = _dec3(_class = _dec4(_class = _dec5(_class = _dec6(_class = _dec7(_class = function () {
    function MdButtonCustomElement(element) {
      _classCallCheck(this, MdButtonCustomElement);

      this.element = element;
      this.change = this.change.bind(this);
    }

    MdButtonCustomElement.prototype.click = function click($event) {
      this.disabled && $event.stopPropagation();
    };

    MdButtonCustomElement.prototype.disabledChanged = function disabledChanged() {
      this.button && this.change();
    };

    MdButtonCustomElement.prototype.change = function change(input) {
      this.disabled = this.disabled || this.disabled === '';
    };

    MdButtonCustomElement.prototype.attached = function attached() {
      var _button$classList;

      setTimeout(this.change);

      this.class && (_button$classList = this.button.classList).add.apply(_button$classList, this.class.split(' '));

      if (typeof this.color == 'string' && this.color.slice(0, 4) != 'mdl-') {
        this.color = 'mdl-button--' + (this.color || 'colored');
      }

      if (this.fab > 0) {
        this.button.classList.add('mdl-button--fab');
        this.button.style.height = this.fab + 'px';
        this.button.style.width = this.fab + 'px';
        this.button.style['min-width'] = this.button.style.width;
        this.button.style['font-size'] = this.fab * .75 + 'px';
        this.button.style['line-height'] = this.fab + 'px';
      }

      if (this.element.parentElement.tagName == 'MD-DRAWER') {
        this.button.style.width = "100%";
        this.button.style.height = "auto";
        this.button.style.padding = "16px 8px";
        this.button.style['line-height'] = "18px";
      }
    };

    return MdButtonCustomElement;
  }()) || _class) || _class) || _class) || _class) || _class) || _class) || _class);
});
define('client/src/elems/md-checkbox',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MdCheckboxCustomElement = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _dec2, _dec3, _dec4, _class;

  var MdCheckboxCustomElement = exports.MdCheckboxCustomElement = (_dec = (0, _aureliaFramework.bindable)({ name: 'checked', defaultBindingMode: _aureliaFramework.bindingMode.twoWay }), _dec2 = (0, _aureliaFramework.bindable)('disabled'), _dec3 = (0, _aureliaFramework.bindable)('required'), _dec4 = (0, _aureliaFramework.inject)(Element, _aureliaFramework.TaskQueue), _dec(_class = _dec2(_class = _dec3(_class = _dec4(_class = function () {
    function MdCheckboxCustomElement(element, taskQueue) {
      var _this = this;

      _classCallCheck(this, MdCheckboxCustomElement);

      this.tabindex = element.tabIndex;
      this.taskQueue = taskQueue;

      element.addEventListener('click', function (e) {
        return _this.disabled && e.stopPropagation();
      });
    }

    MdCheckboxCustomElement.prototype.stopPropogation = function stopPropogation() {
      return true;
    };

    MdCheckboxCustomElement.prototype.checkedChanged = function checkedChanged() {
      var _this2 = this;

      this.checked = !!this.checked;
      this.taskQueue.queueTask(function (_) {
        return _this2.label && _this2.label.MaterialCheckbox && _this2.label.MaterialCheckbox.checkToggleState();
      });
    };

    MdCheckboxCustomElement.prototype.disabledChanged = function disabledChanged() {
      var _this3 = this;

      this.taskQueue.queueTask(function (_) {
        return _this3.label && _this3.label.MaterialCheckbox && _this3.label.MaterialCheckbox.checkDisabled();
      });
    };

    MdCheckboxCustomElement.prototype.attached = function attached() {
      componentHandler.upgradeElement(this.label);
      this.checkedChanged();
    };

    return MdCheckboxCustomElement;
  }()) || _class) || _class) || _class) || _class);
});
define('client/src/elems/md-drawer',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MdDrawerCustomElement = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var drawer = document.createElement('nav');
  drawer.classList.add("mdl-layout__drawer");
  var MdDrawerCustomElement = exports.MdDrawerCustomElement = (_dec = (0, _aureliaFramework.inject)(Element), _dec(_class = function () {
    function MdDrawerCustomElement(element) {
      _classCallCheck(this, MdDrawerCustomElement);

      element.classList.add("mdl-navigation");
      element.style['padding-top'] = '6px';

      this.autofocus = element.hasAttribute('autofocus');

      drawer.appendChild(element);
    }

    MdDrawerCustomElement.prototype.attached = function attached() {
      this.header = document.querySelector('.mdl-layout__header');
      this.header.parentNode.insertBefore(drawer, this.header.nextSibling);

      componentHandler.upgradeAllRegistered();

      this.button = document.querySelector('.mdl-layout__drawer-button');

      if (this.button) this.button.style.display = 'block';

      if (this.autofocus && this.header.firstChild && this.header.firstChild.click) this.header.firstChild.click();
    };

    MdDrawerCustomElement.prototype.detached = function detached() {
      if (drawer.children.length == 1 && this.button) this.button.style.display = 'none';

      drawer.removeChild(drawer.firstChild);
    };

    return MdDrawerCustomElement;
  }()) || _class);
});
define('client/src/elems/md-input',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MdInputCustomElement = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _dec12, _dec13, _dec14, _class;

  var MdInputCustomElement = exports.MdInputCustomElement = (_dec = (0, _aureliaFramework.bindable)({ name: 'value', defaultBindingMode: _aureliaFramework.bindingMode.twoWay }), _dec2 = (0, _aureliaFramework.bindable)('disabled'), _dec3 = (0, _aureliaFramework.bindable)('pattern'), _dec4 = (0, _aureliaFramework.bindable)('step'), _dec5 = (0, _aureliaFramework.bindable)('type'), _dec6 = (0, _aureliaFramework.bindable)('placeholder'), _dec7 = (0, _aureliaFramework.bindable)('input'), _dec8 = (0, _aureliaFramework.bindable)('max'), _dec9 = (0, _aureliaFramework.bindable)('min'), _dec10 = (0, _aureliaFramework.bindable)('required'), _dec11 = (0, _aureliaFramework.bindable)('minlength'), _dec12 = (0, _aureliaFramework.bindable)('maxlength'), _dec13 = (0, _aureliaFramework.bindable)('autofocus'), _dec14 = (0, _aureliaFramework.inject)(_aureliaFramework.TaskQueue), _dec(_class = _dec2(_class = _dec3(_class = _dec4(_class = _dec5(_class = _dec6(_class = _dec7(_class = _dec8(_class = _dec9(_class = _dec10(_class = _dec11(_class = _dec12(_class = _dec13(_class = _dec14(_class = function () {
    function MdInputCustomElement(taskQueue) {
      _classCallCheck(this, MdInputCustomElement);

      this.taskQueue = taskQueue;
    }

    MdInputCustomElement.prototype.valueChanged = function valueChanged() {
      this.changed('checkDirty');
    };

    MdInputCustomElement.prototype.disabledChanged = function disabledChanged() {
      this.changed('checkDisabled');
    };

    MdInputCustomElement.prototype.maxChanged = function maxChanged() {
      this.changed();
    };

    MdInputCustomElement.prototype.minChanged = function minChanged() {
      this.changed();
    };

    MdInputCustomElement.prototype.maxlengthChanged = function maxlengthChanged() {
      this.changed();
    };

    MdInputCustomElement.prototype.minlengthChanged = function minlengthChanged() {
      this.changed();
    };

    MdInputCustomElement.prototype.requiredChanged = function requiredChanged() {
      this.changed();
    };

    MdInputCustomElement.prototype.patternChanged = function patternChanged() {
      this.changed();
    };

    MdInputCustomElement.prototype.changed = function changed(methodName) {
      var _this = this;

      this.taskQueue.queueTask(function (_) {
        if (!_this.div || !_this.div.MaterialTextfield) return;

        methodName && _this.div.MaterialTextfield[methodName]();

        _this.div.MaterialTextfield.checkValidity();

        if (!_this.input.validity.valid) console.log('invalid input:', _this.input.value, _this.input.pattern, _this.input.validity);

        _this.div.MaterialTextfield.input_.dispatchEvent(new Event('change', { bubbles: true }));
      });
    };

    MdInputCustomElement.prototype.attached = function attached() {
      componentHandler.upgradeElement(this.div);

      if (!this.placeholder && this.type != 'date') this.div.classList.remove('has-placeholder');

      if (this.autofocus || this.autofocus === '') this.div.MaterialTextfield.input_.focus();
    };

    return MdInputCustomElement;
  }()) || _class) || _class) || _class) || _class) || _class) || _class) || _class) || _class) || _class) || _class) || _class) || _class) || _class) || _class);
});
define('client/src/elems/md-loading',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MdLoadingCustomElement = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var MdLoadingCustomElement = exports.MdLoadingCustomElement = (_dec = (0, _aureliaFramework.bindable)('value'), _dec(_class = function () {
    function MdLoadingCustomElement() {
      _classCallCheck(this, MdLoadingCustomElement);
    }

    MdLoadingCustomElement.prototype.valueChanged = function valueChanged(val) {
      var _this = this;

      setTimeout(function (_) {
        return _this.div && _this.div.MaterialProgress.setProgress(Math.min(val, 100));
      });
    };

    MdLoadingCustomElement.prototype.attached = function attached() {
      componentHandler.upgradeElement(this.div);
    };

    return MdLoadingCustomElement;
  }()) || _class);
});
define('client/src/elems/md-menu',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MdMenuCustomElement = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var MdMenuCustomElement = exports.MdMenuCustomElement = (_dec = (0, _aureliaFramework.inject)(_aureliaFramework.ObserverLocator, Element), _dec(_class = function () {
    function MdMenuCustomElement(observer, element) {
      _classCallCheck(this, MdMenuCustomElement);

      this.id = 'id' + Date.now();
      this.element = element;
      this.observer = observer;
    }

    MdMenuCustomElement.prototype.click = function click($event) {
      if ($event.target.tagName != 'INPUT' && !$event.target.disabled) return true;

      $event.stopImmediatePropagation();
    };

    MdMenuCustomElement.prototype.setDisabled = function setDisabled(li, disabled) {
      disabled ? li.setAttribute('disabled', '') : li.removeAttribute('disabled');
    };

    MdMenuCustomElement.prototype.resize = function resize() {
      var height = this.ul.getBoundingClientRect().height;
      var width = this.ul.getBoundingClientRect().width;

      console.log('resize', height, width);

      this.ul.MaterialMenu.container_.style.width = width + 'px';
      this.ul.MaterialMenu.container_.style.height = height + 'px';
      this.ul.MaterialMenu.outline_.style.width = width + 'px';
      this.ul.MaterialMenu.outline_.style.height = height + 'px';
      this.ul.style.clip = 'rect(0 ' + width + 'px ' + height + 'px 0)';
    };

    MdMenuCustomElement.prototype.attached = function attached() {
      var _this = this;

      var _loop = function _loop() {
        if (_isArray) {
          if (_i >= _iterator.length) return 'break';
          _ref = _iterator[_i++];
        } else {
          _i = _iterator.next();
          if (_i.done) return 'break';
          _ref = _i.value;
        }

        var li = _ref;

        li.classList.add('mdl-menu__item');
        _this.setDisabled(li, li.disabled);
        _this.observer.getObserver(li, 'disabled').subscribe(function (disabled) {
          _this.setDisabled(li, disabled);
        });
      };

      for (var _iterator = this.element.querySelectorAll('li'), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        var _ret = _loop();

        if (_ret === 'break') break;
      }

      this.element.resize = function (opts) {
        return setTimeout(function (_) {
          return _this.resize(opts);
        }, 100);
      };
    };

    return MdMenuCustomElement;
  }()) || _class);
});
define('client/src/elems/md-select',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MdSelectCustomElement = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _class;

  var MdSelectCustomElement = exports.MdSelectCustomElement = (_dec = (0, _aureliaFramework.bindable)({ name: 'value', defaultBindingMode: _aureliaFramework.bindingMode.twoWay }), _dec2 = (0, _aureliaFramework.bindable)('style'), _dec3 = (0, _aureliaFramework.bindable)('options'), _dec4 = (0, _aureliaFramework.bindable)('disabled'), _dec5 = (0, _aureliaFramework.bindable)('default'), _dec6 = (0, _aureliaFramework.bindable)('required'), _dec7 = (0, _aureliaFramework.bindable)('property'), _dec(_class = _dec2(_class = _dec3(_class = _dec4(_class = _dec5(_class = _dec6(_class = _dec7(_class = function () {
    function MdSelectCustomElement() {
      _classCallCheck(this, MdSelectCustomElement);
    }

    MdSelectCustomElement.prototype.disabledChanged = function disabledChanged() {
      var _this = this;

      setTimeout(function (_) {
        return _this.div && _this.div.MaterialTextfield && _this.div.MaterialTextfield.checkDisabled();
      });
    };

    MdSelectCustomElement.prototype.valueChanged = function valueChanged() {
      var _this2 = this;

      setTimeout(function (_) {
        return _this2.div && _this2.div.MaterialTextfield && _this2.div.MaterialTextfield.checkDirty();
      });
    };

    MdSelectCustomElement.prototype.attached = function attached() {
      componentHandler.upgradeElement(this.div);
    };

    return MdSelectCustomElement;
  }()) || _class) || _class) || _class) || _class) || _class) || _class) || _class);
});
define('client/src/elems/md-shadow',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MdShadowCustomAttribute = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var MdShadowCustomAttribute = exports.MdShadowCustomAttribute = (_dec = (0, _aureliaFramework.inject)(Element), _dec(_class = function MdShadowCustomAttribute(element) {
    _classCallCheck(this, MdShadowCustomAttribute);

    element.classList.add("mdl-shadow--" + element.getAttribute('md-shadow') + "dp");
  }) || _class);
});
define('client/src/elems/md-snackbar',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MdSnackbarCustomElement = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _dec2, _class;

  var MdSnackbarCustomElement = exports.MdSnackbarCustomElement = (_dec = (0, _aureliaFramework.bindable)('show'), _dec2 = (0, _aureliaFramework.inject)(Element), _dec(_class = _dec2(_class = function () {
    function MdSnackbarCustomElement(element) {
      _classCallCheck(this, MdSnackbarCustomElement);

      this.element = element;
    }

    MdSnackbarCustomElement.prototype.attached = function attached() {
      var _this = this;

      componentHandler.upgradeElement(this.element);
      this.element.show = function (opts) {
        if (typeof opts == 'string') opts = { message: opts, timeout: 5000 };

        _this.element.MaterialSnackbar.showSnackbar(opts);
      };
      this.element.error = function (msg, err) {
        if (!err) {
          err = msg;
          msg = '';
        }
        msg = msg + ' ' + err.message;
        _this.element.show(msg);
        console.error(msg, err);
        return err;
      };
    };

    return MdSnackbarCustomElement;
  }()) || _class) || _class);
});
define('client/src/elems/md-switch',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MdSwitchCustomElement = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _dec2, _dec3, _dec4, _class;

  var MdSwitchCustomElement = exports.MdSwitchCustomElement = (_dec = (0, _aureliaFramework.bindable)({ name: 'checked', defaultBindingMode: _aureliaFramework.bindingMode.twoWay }), _dec2 = (0, _aureliaFramework.bindable)('disabled'), _dec3 = (0, _aureliaFramework.bindable)('required'), _dec4 = (0, _aureliaFramework.inject)(Element), _dec(_class = _dec2(_class = _dec3(_class = _dec4(_class = function () {
    function MdSwitchCustomElement(elem) {
      var _this = this;

      _classCallCheck(this, MdSwitchCustomElement);

      elem.addEventListener('click', function (e) {
        return _this.disabled && e.stopPropagation();
      });
    }

    MdSwitchCustomElement.prototype.stopPropogation = function stopPropogation() {
      return true;
    };

    MdSwitchCustomElement.prototype.checkedChanged = function checkedChanged() {
      var _this2 = this;

      this.checked = !!this.checked;
      setTimeout(function (_) {
        return _this2.label && _this2.label.MaterialSwitch.checkToggleState();
      });
    };

    MdSwitchCustomElement.prototype.disabledChanged = function disabledChanged() {
      var _this3 = this;

      setTimeout(function (_) {
        return _this3.label && _this3.label.MaterialSwitch.checkDisabled();
      });
    };

    MdSwitchCustomElement.prototype.attached = function attached() {
      componentHandler.upgradeElement(this.label);
      this.checkedChanged();
      this.disabledChanged();
    };

    return MdSwitchCustomElement;
  }()) || _class) || _class) || _class) || _class);
});
define('client/src/elems/md-table',["exports", "aurelia-framework"], function (exports, _aureliaFramework) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MdTableCustomAttribute = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var MdTableCustomAttribute = exports.MdTableCustomAttribute = (_dec = (0, _aureliaFramework.inject)(Element), _dec(_class = function () {
    function MdTableCustomAttribute(element) {
      _classCallCheck(this, MdTableCustomAttribute);

      element.classList.add("mdl-data-table");
      element.classList.add("mdl-js-data-table");
      element.style.border = "none";

      if (element.getAttribute('md-table')) element.classList.add("mdl-data-table--selectable");

      this.element = element;
    }

    MdTableCustomAttribute.prototype.valueChanged = function valueChanged(selectable) {

      var checkboxes = this.element.querySelectorAll('input[type="checkbox"]');

      for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].disabled = selectable == 'false';
      }
    };

    MdTableCustomAttribute.prototype.attached = function attached() {
      componentHandler.upgradeElement(this.element);
    };

    return MdTableCustomAttribute;
  }()) || _class);
});
define('client/src/elems/md-text',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MdTextCustomElement = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _dec2, _dec3, _dec4, _dec5, _class;

  var MdTextCustomElement = exports.MdTextCustomElement = (_dec = (0, _aureliaFramework.bindable)({ name: 'value', defaultBindingMode: _aureliaFramework.bindingMode.twoWay }), _dec2 = (0, _aureliaFramework.bindable)('disabled'), _dec3 = (0, _aureliaFramework.bindable)('placeholder'), _dec4 = (0, _aureliaFramework.bindable)('required'), _dec5 = (0, _aureliaFramework.bindable)('autofocus'), _dec(_class = _dec2(_class = _dec3(_class = _dec4(_class = _dec5(_class = function () {
    function MdTextCustomElement() {
      _classCallCheck(this, MdTextCustomElement);
    }

    MdTextCustomElement.prototype.valueChanged = function valueChanged() {
      var _this = this;

      setTimeout(function (_) {
        _this.div && _this.div.MaterialTextfield && _this.div.MaterialTextfield.checkDirty();
        _this.div && _this.div.MaterialTextfield && _this.div.MaterialTextfield.checkValidity();
      });
    };

    MdTextCustomElement.prototype.disabledChanged = function disabledChanged() {
      var _this2 = this;

      setTimeout(function (_) {
        _this2.div && _this2.div.MaterialTextfield && _this2.div.MaterialTextfield.checkDisabled();
        _this2.div && _this2.div.MaterialTextfield && _this2.div.MaterialTextfield.checkValidity();
      });
    };

    MdTextCustomElement.prototype.attached = function attached() {
      componentHandler.upgradeElement(this.div);

      if (!this.placeholder) this.div.classList.remove('has-placeholder');

      if (this.autofocus || this.autofocus === '') this.div.MaterialTextfield.input_.focus();
    };

    return MdTextCustomElement;
  }()) || _class) || _class) || _class) || _class) || _class);
});
define('client/src/libs/csv',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var csv = exports.csv = { toJSON: toJSON, fromJSON: fromJSON };
});
define('client/src/libs/pouch',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var Pouch = exports.Pouch = function Pouch() {
    _classCallCheck(this, Pouch);

    return pouchdbClient;
  };
});
define('client/src/resources/helpers',['exports', 'aurelia-router'], function (exports, _aureliaRouter) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.expShortcuts = expShortcuts;
  exports.clearNextProperty = clearNextProperty;
  exports.qtyShortcuts = qtyShortcuts;
  exports.removeTransactionIfQty0 = removeTransactionIfQty0;
  exports.incrementBin = incrementBin;
  exports.saveTransaction = saveTransaction;
  exports.scrollSelect = scrollSelect;
  exports.focusInput = focusInput;
  exports.toggleDrawer = toggleDrawer;
  exports.drugSearch = drugSearch;
  exports.groupDrugs = groupDrugs;
  exports.drugName = drugName;
  exports.parseUserDate = parseUserDate;
  exports.toJsonDate = toJsonDate;
  exports.waitForDrugsToIndex = waitForDrugsToIndex;
  exports.canActivate = canActivate;
  exports.getHistory = getHistory;
  exports.currentDate = currentDate;
  function expShortcuts($event, $index) {
    if ($event.which == 13) return this.focusInput('#qty_' + $index);

    return true;
  }

  function clearNextProperty(old_next, property) {
    if (old_next.length) {
      if (property == 'pended' || Array.isArray(old_next[0])) return [];
      if (old_next[0][property]) delete old_next[0][property];
      if (!Object.keys(old_next[0]).length) return [];
    }
    return old_next;
  }

  function qtyShortcuts($event, $index) {
    if ($event.which == 13) return this.focusInput('#bin_' + $index, 'md-autocomplete');

    return clearIfAsterick($event);
  }

  function removeTransactionIfQty0($event, $index) {

    var transaction = this.transactions[$index];
    var doneeDelete = !transaction.qty.from && transaction.qty.to === 0;
    var donorDelete = !transaction.qty.to && transaction.qty.from === 0;

    if (!donorDelete && !doneeDelete) return true;

    this.drugs = [];
    this.transactions.splice($index, 1);
    this.db.transaction.remove(transaction);
    this.focusInput('md-autocomplete');
  }

  function incrementBin($event, transaction) {

    if ($event.which == 107 || $event.which == 187) var increment = 1;

    if ($event.which == 109 || $event.which == 189) var increment = -1;

    if (!increment) return clearIfAsterick($event);

    var binLetter = transaction.bin[0];
    var binNumber = +transaction.bin.slice(1) + increment;

    if (binNumber < 0 || binNumber > 699) {
      binLetter = String.fromCharCode(binLetter.charCodeAt() + increment);
      binNumber = (binNumber + 700) % 700;
    }

    transaction.bin = binLetter + ('00' + binNumber).slice(-3);
    saveTransaction.call(this, transaction);
    return false;
  }

  function clearIfAsterick($event) {
    return $event.which == 106 || $event.shiftKey && $event.which == 56 ? $event.target.value = "" : true;
  }

  function saveTransaction(transaction) {
    var _this = this;

    return this._saveTransaction = Promise.resolve(this._saveTransaction).then(function (_) {
      return _this.db.transaction.put(transaction);
    }).catch(function (err) {
      delete _this._saveTransaction;
      throw _this.snackbar.error(err);
    });
  }

  function scrollSelect($event, curr) {
    var list = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
    var cb = arguments[3];


    var index = list.indexOf(curr);
    var last = list.length - 1;

    if ($event.which == 38) cb.call(this, list[index > 0 ? index - 1 : last]);

    if ($event.which == 40) cb.call(this, list[index < last ? index + 1 : 0]);
  }

  function focusInput(selector, fallback) {
    var elem = document.querySelector(selector + ' input');

    if (elem && !elem.disabled) elem.focus();else if (fallback) document.querySelector(fallback + ' input').focus();else console.log('Cannot find ' + selector + ' input');

    return false;
  }

  function toggleDrawer() {
    var drawer = document.querySelector('.mdl-layout__header');
    drawer && drawer.firstChild.click();
  }

  var _drugSearch = {
    name: function name(term, clearCache) {
      var start = Date.now();
      var terms = term.toLowerCase().replace('.', '\\.').split(/, |[, ]/g);

      if (!term.startsWith(_drugSearch._term) || clearCache) {
        _drugSearch._term = term;
        var nameRange = _drugSearch.range(terms[0]);

        _drugSearch._drugs = this.db.drug.query('name', nameRange).then(function (res) {

          console.log('QUERY', term, res.rows.length, 'rows and took', Date.now() - start, nameRange);

          return res.rows.map(function (row) {
            return row.doc;
          });
        });
      }

      var regex = RegExp('(?=.*' + terms.join(')(?=.*( |0)') + ')', 'i');
      return _drugSearch._drugs.then(function (drugs) {

        var unknowns = {};

        return drugs.filter(function (drug) {
          var isMatch = regex.test(drug.generic + ' ' + (drug.brand || '') + ' ' + (drug.labeler || ''));

          if (isMatch && !unknowns[drug.generic]) {
            var unknown = JSON.parse(JSON.stringify(drug));
            unknown.labeler = '';
            unknown._id = "Unspecified";
            unknowns[drug.generic] = unknown;
          }

          return isMatch;
        }).concat(Object.values(unknowns));
      }).then(function (drugs) {
        console.log('FILTER', term, drugs.length, 'rows and took', Date.now() - start, 'cache', _drugSearch._term);
        _drugSearch._term = term;
        return drugs;
      });
    },
    addPkgCode: function addPkgCode(term, drug) {
      var pkg, ndc9, upc;
      if (term.length > 8) {
        ndc9 = '^' + drug.ndc9 + '(\\d{2})$';
        upc = '^' + drug.upc + '(\\d{' + (10 - drug.upc.length) + '})$';
        pkg = term.match(RegExp(ndc9 + '|' + upc));
      }

      drug.pkg = pkg ? pkg[1] || pkg[2] : '';
      return drug;
    },
    range: function range(term) {
      return { startkey: term, endkey: term + '\uFFFF', include_docs: true };
    },
    ndc: function ndc(_ndc, clearCache) {
      var start = Date.now();

      var split = _ndc.split('-');
      var term = split.join('');

      if (term.length == 12 && term[0] == '3') term = term.slice(1, -1);

      if (!term.startsWith(_drugSearch._term) || clearCache) {

        _drugSearch._term = term;

        var ndc9Range = _drugSearch.range(term.slice(0, 9));
        var upc8Range = _drugSearch.range(term.slice(0, 8));
        var ndc9Query = this.db.drug.query('ndc9', ndc9Range);
        var upc8Query = this.db.drug.query('upc', upc8Range);

        _drugSearch._drugs = Promise.all([ndc9Query, upc8Query]).then(function (_ref) {
          var ndc9 = _ref[0],
              upc = _ref[1];


          var unique = {};

          for (var _iterator = ndc9.rows, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref2;

            if (_isArray) {
              if (_i >= _iterator.length) break;
              _ref2 = _iterator[_i++];
            } else {
              _i = _iterator.next();
              if (_i.done) break;
              _ref2 = _i.value;
            }

            var drug = _ref2;

            unique[drug.doc._id] = drug.doc;
          }for (var _iterator2 = upc.rows, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
            var _ref3;

            if (_isArray2) {
              if (_i2 >= _iterator2.length) break;
              _ref3 = _iterator2[_i2++];
            } else {
              _i2 = _iterator2.next();
              if (_i2.done) break;
              _ref3 = _i2.value;
            }

            var _drug = _ref3;

            if (_drug.doc.upc.length != 9 && term.length != 11) unique[_drug.doc._id] = _drug.doc;
          }unique = Object.keys(unique).map(function (key) {
            return _drugSearch.addPkgCode(term, unique[key]);
          });
          console.log('QUERY', term, 'time ms', Date.now() - start, 'ndc9Range', ndc9Range, 'upc8Range', upc8Range, unique);
          return unique;
        });
      }

      return _drugSearch._drugs.then(function (drugs) {

        var matches = {
          ndc11: [],
          ndc9: [],
          upc10: [],
          upc8: []
        };

        for (var _iterator3 = drugs, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
          var _ref4;

          if (_isArray3) {
            if (_i3 >= _iterator3.length) break;
            _ref4 = _iterator3[_i3++];
          } else {
            _i3 = _iterator3.next();
            if (_i3.done) break;
            _ref4 = _i3.value;
          }

          var drug = _ref4;


          if (drug.ndc9.startsWith(term)) matches.ndc11.push(drug);else if (drug.upc.startsWith(term)) matches.upc10.push(drug);else if (term.startsWith(drug.ndc9)) {
            _drugSearch.addPkgCode(term, drug);
            matches.ndc9.push(drug);
          } else if (term.startsWith(drug.upc)) {
            _drugSearch.addPkgCode(term, drug);
            matches.upc8.push(drug);
          }
        }

        console.log('FILTER', term, 'time ms', Date.now() - start, 'matches.ndc11', matches.ndc11, 'matches.upc10', matches.upc10, 'matches.ndc9', matches.ndc9, 'matches.upc8', matches.upc8);
        return [].concat(matches.ndc11, matches.upc10, matches.ndc9, matches.upc8);
      });
    }
  };

  function drugSearch() {
    var _this2 = this;

    if (!this.term) return Promise.resolve([]);

    var term = this.term.trim();
    var type = /^[\d-]+$/.test(term) ? 'ndc' : 'name';

    if (type == 'ndc' && this.term.length < 5 || type == 'name' && this.term.length < 3) return Promise.resolve([]);

    var clearCache = this._savingDrug;
    var start = Date.now();

    return this._search = Promise.resolve(this._search).then(function (_) {
      return _drugSearch[type].call(_this2, term, clearCache);
    }).then(function (res) {
      console.log('drugSearch', type, term, 'wait for previous query', 'query time', Date.now() - start);
      return res;
    }).catch(function (err) {
      return console.log('drugSearch error', err);
    });
  }

  function groupDrugs(drugs, ordered) {

    var groups = {};
    for (var _iterator4 = drugs, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
      var _ref5;

      if (_isArray4) {
        if (_i4 >= _iterator4.length) break;
        _ref5 = _iterator4[_i4++];
      } else {
        _i4 = _iterator4.next();
        if (_i4.done) break;
        _ref5 = _i4.value;
      }

      var drug = _ref5;

      var generic = drug.generic;
      groups[generic] = groups[generic] || { generic: generic, name: drugName(drug, ordered), drugs: [] };
      groups[generic].drugs.push(drug);
    }

    return Object.keys(groups).map(function (key) {
      return groups[key];
    });
  }

  function drugName(drug, ordered) {
    var name = drug.generic;
    var desc = [];

    var display = ordered[name] && ordered[name].displayMessage;
    if (drug.brand) desc.push(drug.brand);
    if (display) desc.push(display);

    if (desc.length) name += ' (' + desc.join(', ') + ')';

    return name;
  }

  function parseUserDate(date) {

    date = (date || '').split('/');

    var year = '';

    if (date.length > 1) year = date.pop().slice(-2);else if (date[0].length > 3) year = date[0].slice(-2);

    return { month: date[0].slice(0, 2), year: year };
  }

  function toJsonDate(_ref6) {
    var month = _ref6.month,
        year = _ref6.year;

    console.log('date', month, year, new Date('20' + year, month - 1, 1).toJSON());
    return new Date('20' + year, month - 1, 1).toJSON();
  }

  function waitForDrugsToIndex() {
    var _this3 = this;

    this.db.drug.drugIsIndexed.get().then(function (_) {
      _this3.drugsIndexed = true;
      _this3.placeholder = "Search Drugs By Generic Name Or NDC...";
    });
  }

  function canActivate(_, next, _ref7) {
    var router = _ref7.router;

    return this.db.user.session.get().then(function (session) {

      var loggedIn = session && session.account;

      for (var _iterator5 = router.navigation, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
        var _ref8;

        if (_isArray5) {
          if (_i5 >= _iterator5.length) break;
          _ref8 = _iterator5[_i5++];
        } else {
          _i5 = _iterator5.next();
          if (_i5.done) break;
          _ref8 = _i5.value;
        }

        var route = _ref8;

        route.isVisible = loggedIn ? route.config.roles && ~route.config.roles.indexOf('user') : !route.config.roles;
      }var canActivate = next.navModel.isVisible || !next.nav;

      return canActivate || router.currentInstruction ? canActivate : new _aureliaRouter.Redirect(loggedIn ? 'shipments' : 'login');
    }).catch(function (err) {
      return console.log('loginRequired error', err);
    });
  }

  function getHistory(id) {
    var _this4 = this;

    return this.db.transaction.history.get(id).then(function (_history) {
      console.log('history', id, _history);

      function id(k, o) {
        if (Array.isArray(o)) return o;
        return o.shipment.from.name + ' ' + o._id;
      }

      function pad(word, num) {
        return (word + ' '.repeat(num)).slice(0, num);
      }
      return JSON.stringify(_history, function (k, v) {
        if (Array.isArray(v)) return v;

        var status = _this4.status || 'pickup';
        var fromName = 'From: ' + v.shipment.account.from.name;
        var fromStreet = v.shipment.account.from.street;
        var fromAddress = v.shipment.account.from.city + ', ' + v.shipment.account.from.state + ' ' + v.shipment.account.from.zip;
        var date = pad(v._id.slice(0, 10), 20);
        var qty = '<a href=\'https://' + window.location.hostname + ':8443/_utils/#database/transaction/' + v._id + '\' target=\'_blank\'>' + pad('Quantity ' + (v.qty.to || v.qty.from), 20) + '</a>';
        var tracking = pad(v.type, 20);
        var toName = '';
        var toStreet = '';
        var toAddress = '';

        if (v.shipment._id) date = '<a href=\'/#/shipments/' + v.shipment._id + '\'>' + date + '</a>';

        if (v.shipment.account.to) {
          toName = 'To: ' + v.shipment.account.to.name;
          toStreet = v.shipment.account.to.street;
          toAddress = v.shipment.account.to.city + ', ' + v.shipment.account.to.state + ' ' + v.shipment.account.to.zip;
          tracking = '<a target=\'_blank\' href=\'https://www.fedex.com/apps/fedextrack/?tracknumbers=' + v.shipment.tracking + '\'>' + pad('FedEx Tracking', 20) + '</a>';
        }

        return date + pad(fromName, 35) + toName + "<br>" + qty + pad(fromStreet, 35) + toStreet + '<br>' + tracking + pad(fromAddress, 35) + toAddress;
      }, "   ").slice(2, -2).replace(/(\[\n?\s*){1,2}/g, "<div style='border-left:1px solid; padding-left:8px; margin-top:-12px'>").replace(/(\n?\s*\],?){1,2}/g, '</div>').replace(/ *"/g, '').replace(/\n/g, '<br><br>');
    });
  }

  function currentDate(addMonths, split) {
    var date = new Date();
    date.setMonth(date.getMonth() + addMonths);
    date = date.toJSON();
    return split ? date.split(/\-|T|:|\./) : date;
  }
});
define('client/src/resources/value-converters',['exports', '../resources/helpers'], function (exports, _helpers) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.toArrayValueConverter = exports.dateValueConverter = exports.boldValueConverter = exports.valueValueConverter = exports.userFilterValueConverter = exports.drugFilterValueConverter = exports.shipmentFilterValueConverter = exports.upperCaseValueConverter = exports.numberValueConverter = exports.jsonValueConverter = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var jsonValueConverter = exports.jsonValueConverter = function () {
    function jsonValueConverter() {
      _classCallCheck(this, jsonValueConverter);
    }

    jsonValueConverter.prototype.toView = function toView() {
      var object = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

      return JSON.stringify(object, null, " ");
    };

    return jsonValueConverter;
  }();

  var numberValueConverter = exports.numberValueConverter = function () {
    function numberValueConverter() {
      _classCallCheck(this, numberValueConverter);
    }

    numberValueConverter.prototype.fromView = function fromView(str) {
      return str === '' ? null : +str;
    };

    numberValueConverter.prototype.toView = function toView(num, decimals) {
      return num && decimals != null ? num.toFixed(decimals) : num;
    };

    return numberValueConverter;
  }();

  var upperCaseValueConverter = exports.upperCaseValueConverter = function () {
    function upperCaseValueConverter() {
      _classCallCheck(this, upperCaseValueConverter);
    }

    upperCaseValueConverter.prototype.fromView = function fromView(str) {
      return str == null ? null : str.toUpperCase();
    };

    return upperCaseValueConverter;
  }();

  var shipmentFilterValueConverter = exports.shipmentFilterValueConverter = function () {
    function shipmentFilterValueConverter() {
      _classCallCheck(this, shipmentFilterValueConverter);
    }

    shipmentFilterValueConverter.prototype.toView = function toView() {
      var shipments = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var filter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

      filter = filter.toLowerCase();
      return shipments.filter(function (shipment) {
        return ~(shipment.account.from.name + ' ' + shipment.account.to.name + ' ' + shipment.tracking + ' ' + shipment.status + ' ' + (shipment._id && shipment._id.slice(0, 10))).toLowerCase().indexOf(filter);
      });
    };

    return shipmentFilterValueConverter;
  }();

  var drugFilterValueConverter = exports.drugFilterValueConverter = function () {
    function drugFilterValueConverter() {
      _classCallCheck(this, drugFilterValueConverter);
    }

    drugFilterValueConverter.prototype.toView = function toView() {
      var drugs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var filter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

      filter = filter.replace('.', '\\.').split(/, |[, ]/g);
      var regex = RegExp('(?=.*' + filter.join(')(?=.*( |0)') + ')', 'i');
      return drugs.filter(function (drug) {
        return regex.test(drug.generic);
      });
    };

    return drugFilterValueConverter;
  }();

  var userFilterValueConverter = exports.userFilterValueConverter = function () {
    function userFilterValueConverter() {
      _classCallCheck(this, userFilterValueConverter);
    }

    userFilterValueConverter.prototype.toView = function toView() {
      var users = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var filter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

      filter = filter.toLowerCase();
      var res = users.filter(function (user) {
        try {
          return ~(user.name.first + ' ' + user.name.last).toLowerCase().indexOf(filter);
        } catch (err) {
          console.log('filter err', user, err);
        }
      });
      return res;
    };

    return userFilterValueConverter;
  }();

  var valueValueConverter = exports.valueValueConverter = function () {
    function valueValueConverter() {
      _classCallCheck(this, valueValueConverter);
    }

    valueValueConverter.prototype.toView = function toView() {
      var transactions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var decimals = arguments[1];
      var trigger = arguments[2];


      transactions = Array.isArray(transactions) ? transactions : [transactions];

      return transactions.reduce(function (total, transaction) {
        if (!transaction.drug.price || !transaction.qty) return 0;
        var price = transaction.drug.price.goodrx || transaction.drug.price.nadac || 0;
        var qty = transaction.qty.to || transaction.qty.from || 0;
        return total + qty * price;
      }, 0).toFixed(decimals);
    };

    return valueValueConverter;
  }();

  var boldValueConverter = exports.boldValueConverter = function () {
    function boldValueConverter() {
      _classCallCheck(this, boldValueConverter);
    }

    boldValueConverter.prototype.toView = function toView(text, bold) {
      if (!bold || !text) return text;

      if (typeof bold == 'string') bold = RegExp('(' + bold.replace(/ /g, '|').replace('.', '( | 0)?\\.') + ')', 'gi');

      return text.replace(bold, '<strong>$1</strong>');
    };

    return boldValueConverter;
  }();

  var dateValueConverter = exports.dateValueConverter = function () {
    function dateValueConverter() {
      _classCallCheck(this, dateValueConverter);
    }

    dateValueConverter.prototype.toView = function toView(date) {
      if (!date) return '';
      return date != this.model ? date.slice(5, 7) + '/' + date.slice(2, 4) : this.view;
    };

    dateValueConverter.prototype.fromView = function fromView(date) {

      if (date.includes('*')) return null;

      var _parseUserDate = (0, _helpers.parseUserDate)(date.replace(/\+|\-|\=/g, '')),
          month = _parseUserDate.month,
          year = _parseUserDate.year;

      if (date.includes('+') || date.includes('=')) month++;

      if (date.includes('-')) month--;

      if (month < 1) {
        year--;
        month = 12;
      }

      if (month > 12) {
        year++;
        month = 1;
      }

      this.view = date.length == 1 ? month : ("00" + month).slice(-2) + '/' + year;

      return this.model = (0, _helpers.toJsonDate)({ month: month, year: year });
    };

    return dateValueConverter;
  }();

  var toArrayValueConverter = exports.toArrayValueConverter = function () {
    function toArrayValueConverter() {
      _classCallCheck(this, toArrayValueConverter);
    }

    toArrayValueConverter.prototype.toView = function toView() {
      var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var sort = arguments[1];


      var arr = Object.keys(obj);

      if (sort) arr.sort().reverse();

      return arr.map(function (key) {
        return { key: key, val: obj[key] };
      });
    };

    return toArrayValueConverter;
  }();
});
define('client/src/views/account',['exports', 'aurelia-framework', '../libs/pouch', 'aurelia-router', '../resources/helpers'], function (exports, _aureliaFramework, _pouch, _aureliaRouter, _helpers) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.account = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var account = exports.account = (_dec = (0, _aureliaFramework.inject)(_pouch.Pouch, _aureliaRouter.Router), _dec(_class = function () {
    function account(db, router) {
      _classCallCheck(this, account);

      this.db = db;
      this.router = router;
      this.canActivate = _helpers.canActivate;
      this.csvHref = window.location.protocol + '//' + window.location.hostname;
      this.csvDate = '' + new Date().toJSON().slice(0, -8);
    }

    account.prototype.activate = function activate() {
      var _this = this;

      this.db.user.session.get().then(function (session) {

        _this.session = session;
        _this.switchUserText = "Switch User";

        _this.db.account.query('all-accounts', { include_docs: true }).then(function (accounts) {
          _this.accounts = accounts.rows.map(function (account) {
            return account.doc;
          }).filter(function (account) {
            if (account._id != session.account._id) return true;
            _this.account = account;
          });
        });

        return _this.db.user.query('account._id', { key: session.account._id, include_docs: true }).then(function (users) {
          _this.users = users.rows.map(function (user) {
            return user.doc;
          });
          _this.selectUser();
        });
      });
    };

    account.prototype.selectUser = function selectUser(user) {
      var _this2 = this;

      this.user = user || this.users.filter(function (user) {
        return user._id == _this2.session._id;
      })[0];
    };

    account.prototype.saveUser = function saveUser() {
      this.user._id && this.db.user.put(this.user);
      return true;
    };

    account.prototype.addUser = function addUser() {
      var _this3 = this;

      this.users.unshift(this.user);
      this.db.user.post(this.user).catch(function (err) {
        _this3.users.shift();
        _this3.snackbar.show(err.message || err.reason);
      });
    };

    account.prototype.deleteUser = function deleteUser() {
      var _this4 = this;

      var index = this.users.indexOf(this.user);
      this.db.user.remove(this.user).then(function (_) {
        _this4.users.splice(index, 1);
        _this4.selectUser();
      }).catch(function (err) {
        console.log(err);
        _this4.snackbar.show(err.message || err.reason);
      });
    };

    account.prototype.authorize = function authorize(_id) {
      var _this5 = this;

      console.log('account.authorize', _id, this.account.authorized);
      var index = this.account.authorized.indexOf(_id);
      var method = ~index ? 'delete' : 'post';
      this.db.account.authorized[method](_id).then(function (res) {
        return _this5.account.authorized = res.authorized;
      }).catch(function (err) {
        return console.error('account.authorize', err);
      });
    };

    account.prototype.showUserSwitchPage = function showUserSwitchPage() {
      this.dialog.showModal();
    };

    account.prototype.phoneInAccount = function phoneInAccount(phone) {
      for (var i = 0; i < this.users.length; i++) {
        if (this.users[i].phone.replace(/-/g, '') == phone.replace(/-/g, '')) return true;
      }
      return false;
    };

    account.prototype.switchUsers = function switchUsers(event) {
      var _this6 = this;

      if (!this.phoneInAccount(this.phone)) return this.snackbar.show('Phone number is not in this account');

      console.log("switching to user", this.phone, this.password);

      this.switchUserText = "Switching...";

      this.db.user.session.post({ phone: this.phone, password: this.password, switchUsers: true }).then(function (_) {
        _this6.router.navigate('picking');
      }).catch(function (err) {
        console.log("error:", err);
        _this6.snackbar.error('Login failed', err);
        _this6.switchUserText = "Switch User";
      });
    };

    account.prototype.closeSwitchUsersDialog = function closeSwitchUsersDialog() {
      this.dialog.close();
    };

    account.prototype.logout = function logout() {
      var _this7 = this;

      this.disableLogout = 'Uninstalling...';
      this.db.user.session.delete().then(function (_) {
        _this7.router.navigate('login', { trigger: true });
      }).catch(function (err) {
        return console.trace('Logout failed:', err);
      });
    };

    account.prototype.importCSV = function importCSV($event) {
      var _this8 = this;

      this.snackbar.show('Uploading CSV File');
      var elem = $event.target;
      console.log(elem.parentNode.parentNode.getAttribute('href'), elem.parentNode.parentNode.href, elem.parentNode.parentNode);
      return this.db.ajax({ method: 'post', url: elem.parentNode.parentNode.getAttribute('href'), body: elem.files[0], json: false }).then(function (rows) {
        return _this8.snackbar.show('Import Succesful');
      }).catch(function (err) {
        return _this8.snackbar.error('Import Error', err);
      });
    };

    return account;
  }()) || _class);
});
define('client/src/views/drugs',['exports', 'aurelia-framework', 'aurelia-router', '../libs/pouch', '../libs/csv', '../resources/helpers'], function (exports, _aureliaFramework, _aureliaRouter, _pouch, _csv, _helpers) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.drugs = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var drugs = exports.drugs = (_dec = (0, _aureliaFramework.inject)(_pouch.Pouch, _aureliaRouter.Router), _dec(_class = function () {
    function drugs(db, router) {
      _classCallCheck(this, drugs);

      this.csv = _csv.csv;
      this.db = db;
      this.router = router;
      this.term = '';
      this.scrollDrugs = this.scrollDrugs.bind(this);

      this.toggleDrawer = _helpers.toggleDrawer;
      this.scrollSelect = _helpers.scrollSelect;
      this.drugSearch = _helpers.drugSearch;
      this.groupDrugs = _helpers.groupDrugs;
      this.focusInput = _helpers.focusInput;
      this.drugName = _helpers.drugName;
      this.canActivate = _helpers.canActivate;
      this.currentDate = _helpers.currentDate;
    }

    drugs.prototype.deactivate = function deactivate() {
      removeEventListener('keyup', this.scrollDrugs);
    };

    drugs.prototype.activate = function activate(params) {
      var _this = this;

      addEventListener('keyup', this.scrollDrugs);
      return this.db.user.session.get().then(function (session) {
        return _this.db.account.get(session.account._id);
      }).then(function (account) {
        _this.account = account;
        _this.drawer = {
          ordered: Object.keys(_this.account.ordered).sort()
        };
        if (params.id) return _this.db.drug.get(params.id).then(function (drug) {
          _this.selectDrug(drug, true);
        });

        if (_this.drawer.ordered[0]) return _this.selectDrawer(_this.drawer.ordered[0]);

        return _this.selectDrug();
      }).catch(function (err) {
        console.error('Could not get session for user.  Please verify user registration and login are functioning properly');
      });
    };

    drugs.prototype.scrollGroups = function scrollGroups($event) {
      var _this2 = this;

      Promise.resolve(this._search).then(function (_) {
        _this2.scrollSelect($event, _this2.group, _this2.groups, function (group) {
          return _this2.selectGroup(group, true);
        });

        if ($event.which == 13) _this2.selectGroup(null, true);
      });

      $event.stopPropagation();
    };

    drugs.prototype.scrollDrugs = function scrollDrugs($event) {
      this.group && this.scrollSelect($event, this.drug, this.group.drugs, this.selectDrug);
    };

    drugs.prototype.addDays = function addDays(days) {
      var date = new Date();
      date.setDate(+days + date.getDate());
      return (days ? date : new Date()).toJSON().slice(0, 10);
    };

    drugs.prototype.selectGroup = function selectGroup(group, autoselectDrug) {
      var _this3 = this;

      console.log('selectGroup()', group, this.drug && this.drug.generic);

      this.term = group.generic;

      var order = this.account.ordered[group.generic] || {};
      var minDays = order.minDays || this.account.default && this.account.default.minDays;
      var indate = this.addDays(minDays).split('-');
      var unexpired = this.currentDate(1, true);

      this.db.transaction.query('inventory-by-generic', { startkey: [this.account._id, 'month', indate[0], indate[1], group.generic], endkey: [this.account._id, 'month', indate[0], indate[1], group.generic, {}] }).then(function (inventory) {
        console.log('indate inventory', minDays, indate, inventory);
        var row = inventory.rows[0];
        _this3.indateInventory = row ? row.value[0].sum : 0;
        console.log('indate inventory', _this3.indateInventory);

        _this3.db.transaction.query('inventory-by-generic', { startkey: [_this3.account._id, 'month', unexpired[0], unexpired[1], group.generic], endkey: [_this3.account._id, 'month', unexpired[0], unexpired[1], group.generic, {}] }).then(function (inventory) {
          console.log('outdate inventory', unexpired, inventory);
          var row = inventory.rows[0];
          _this3.outdateInventory = row ? row.value[0].sum - _this3.indateInventory : 0;
          console.log('outdate inventory', _this3.outdateInventory);
        });
      });

      if (!group.drugs) group.drugs = this.search().then(function (_) {
          var filtered = _this3.groups.filter(function (group) {
            console.log('Filtering drug seach for exact results', _this3.term, group.generic, group);
            return _this3.term == group.generic;
          });
          return filtered.length ? filtered[0].drugs : [];
        });

      Promise.resolve(group.drugs).then(function (drugs) {
        group.drugs = drugs;
        _this3.group = group;

        if (autoselectDrug) _this3.selectDrug(group.drugs[0]);
      });
    };

    drugs.prototype.selectDrug = function selectDrug(drug, autoselectGroup) {
      var _this4 = this;

      console.log('selectDrug()', this.group && this.group.name, this.group && this.group.generic, this.drug, drug);

      var url = void 0;

      if (drug) {
        this.drug = drug;
        url = 'drugs/' + this.drug._id;
      } else {
        this.drug = {
          generics: this.drug && this.drug.generics || [],
          form: this.drug && this.drug.form,
          brand: this.drug && this.drug.brand,
          gsns: this.drug && this.drug.gsns
        };
        url = 'drugs';

        setTimeout(function (_) {
          _this4.focusInput('[name=pro_ndc_field]');
        }, 100);
      }

      this.setGenericRows(this.drug.generics.slice(-1)[0], 0, true);
      this.router.navigate(url, { trigger: false });

      if (autoselectGroup) this.selectGroup({ generic: this.drug.generic });
    };

    drugs.prototype.selectDrawer = function selectDrawer(generic) {
      this.selectGroup({ generic: generic }, true);
      this.toggleDrawer();
    };

    drugs.prototype.search = function search() {
      var _this5 = this;

      return this.drugSearch().then(function (drugs) {
        _this5.groups = _this5.groupDrugs(drugs, _this5.account.ordered);
        console.log('drugs.js search()', drugs.length, _this5.groups.length, _this5.groups);
      });
    };

    drugs.prototype.markHazard = function markHazard() {

      if (!this.account.hazards) this.account.hazards = {};

      if (this.account.hazards[this.group.generic]) {
        this.account.hazards[this.group.generic] = undefined;
      } else {
        this.account.hazards[this.group.generic] = { "message": "warning" };
      }

      this.saveAccount();
    };

    drugs.prototype.order = function order() {
      var _this6 = this;

      console.log('before order()', this.group.generic, this.drug.generic);

      if (this.account.ordered[this.group.generic]) {
        this.drawer.ordered = this.drawer.ordered.filter(function (generic) {
          return generic != _this6.group.generic;
        });

        this.account.ordered[this.group.generic] = undefined;
      } else {
        this.drawer.ordered.unshift(this.group.generic);
        this.account.ordered[this.group.generic] = {};
      }
      console.log('after order()', this.group.generic, this.drug.generic);
      this.saveAccount();
    };

    drugs.prototype.exportCSV = function exportCSV(generic) {
      var _this7 = this;

      var inventory = this.db.transaction.query('inventory-by-generic', { key: [this.account._id] });
      var drugs = this.db.drug.allDocs({ include_docs: true, endkey: '_design' });
      Promise.all([inventory, drugs]).then(function (_ref) {
        var inventory = _ref[0],
            drugs = _ref[1];

        console.log('Export queries run');
        var ndcMap = {};
        for (var _iterator = inventory.rows, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
          var _ref2;

          if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref2 = _iterator[_i++];
          } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref2 = _i.value;
          }

          var row = _ref2;

          ndcMap[row.key[2]] = row.value[0];
        }
        console.log('Inital map complete');
        _this7.csv.fromJSON('Drugs ' + new Date().toJSON() + '.csv', drugs.rows.map(function (row) {
          return {
            order: _this7.account.ordered[row.doc.generic],
            '': row.doc,
            upc: "UPC " + row.doc.upc,
            ndc9: "NDC9 " + row.doc.ndc9,
            generics: row.doc.generics.map(function (generic) {
              return generic.name + " " + generic.strength;
            }).join(';'),
            inventory: ndcMap[row.doc._id]
          };
        }));
      });
    };

    drugs.prototype.importCSV = function importCSV() {
      var _this8 = this;

      this.snackbar.show('Parsing csv file');
      function capitalize(text) {
        return text ? text.trim().toLowerCase().replace(/\b[a-z]/g, function (l) {
          return l.toUpperCase();
        }) : text;
      }
      function trim(text) {
        return text ? text.trim() : text;
      }

      this.csv.toJSON(this.$file.files[0], function (drugs) {
        _this8.$file.value = '';
        var errs = [];
        var chain = Promise.resolve();

        var _loop = function _loop(i) {
          chain = chain.then(function (_) {
            var drug = drugs[i];

            if ("add_warning" in drug) {

              console.log("Updating drug warning messages");
              _this8.snackbar.show("Updating warning messages");

              _this8.db.drug.get(drug._id).then(function (drugs_found) {
                var item = drugs_found;
                console.log("Drug found: " + item.generics[0].name + " " + item.generics[0].strength + ", NDC: " + item.ndc9);

                if ("warning" in item) {
                  item.warning = drug.add_warning + "; " + item.warning;
                } else {
                  item.warning = drug.add_warning;
                }

                return _this8.db.drug.post(item).then(function (_) {
                  console.log("Message saved");
                }).catch(function (err) {
                  console.log("ERROR UPDATING MESSAGE:" + JSON.stringify(err));
                });
              }).catch(function (err) {
                console.log("Drug not found: " + JSON.stringify(err));
              });
            } else {
              drug = {
                _id: trim(drug._id),
                brand: trim(drug.brand),
                form: capitalize(drug.form),
                image: trim(drug.image),
                labeler: capitalize(drug.labeler),
                generics: drug.generics.split(";").filter(function (v) {
                  return v;
                }).map(function (generic) {
                  var _generic$split = generic.split(/(?= [\d.]+)/),
                      name = _generic$split[0],
                      strength = _generic$split[1];

                  return {
                    name: capitalize(name),
                    strength: trim(strength || '').toLowerCase().replace(/ /g, '')
                  };
                }),
                price: drug.price
              };

              return _this8.db.drug.post(drug).catch(function (err) {
                drug._err = 'Upload Error: ' + JSON.stringify(err);
                errs.push(drug);
              }).then(function (_) {
                if (+i && i % 100 == 0) _this8.snackbar.show('Imported ' + i + ' of ' + drugs.length);
              });
            }
          });
        };

        for (var i in drugs) {
          _loop(i);
        }

        return chain.then(function (_) {
          return errs;
        });
      }).then(function (rows) {
        return _this8.snackbar.show('Import Succesful');
      }).catch(function (err) {
        return _this8.snackbar.error('Import Error', err);
      });
    };

    drugs.prototype.setGenericRows = function setGenericRows(generic, $index, $last) {
      if (!generic || generic.name && $last) this.drug.generics.push({ strength: '' });
      if (!$last && !generic.name && !generic.strength) {
        this.drug.generics.splice($index, 1);
        setTimeout(function (_) {
          return document.forms[0].dispatchEvent(new Event('change'));
        });
      }
    };

    drugs.prototype.saveAccount = function saveAccount() {
      var _this9 = this;

      return this.db.account.put(this.account).catch(function (_) {
        console.log('after saveAccount()', _this9.group.generic, _this9.drug.generic);
        _this9.snackbar.show('Error while saving: ' + (err.reason || err.message));
      });
    };

    drugs.prototype.showDefaultsDialog = function showDefaultsDialog() {
      console.log('showDefaultsDialog');
      this.dialog.showModal();
    };

    drugs.prototype.closeDefaultsDialog = function closeDefaultsDialog() {
      this.dialog.close();
    };

    drugs.prototype.addDrug = function addDrug() {
      var _this10 = this;

      this._savingDrug = true;

      this.drug.generics.pop();

      this.db.drug.post(this.drug).then(function (res) {
        _this10.drug._rev = res.rev;
        _this10.selectDrug(_this10.drug, true);
        _this10._savingDrug = false;
      }).catch(function (err) {
        _this10._savingDrug = false;
        console.log(err);
        _this10.snackbar.show('Drug not added: ' + (err.reason || err.message || JSON.stringify(err.errors)));
      });
    };

    drugs.prototype.saveDrug = function saveDrug() {
      var _this11 = this;

      this._savingDrug = true;

      this.drug.generics.pop();

      this.db.drug.put(this.drug).then(function (res) {
        if (_this11.group.generic != _this11.drug.generic && _this11.group.drugs.length == 1 && _this11.account.ordered[_this11.group.generic]) _this11.order();

        _this11.selectDrug(_this11.drug, true);
        _this11._savingDrug = false;
      }).catch(function (err) {
        _this11._savingDrug = false;
        _this11.snackbar.show('Drug not saved: ' + (err.reason || err.message));
      });
    };

    drugs.prototype.deleteDrug = function deleteDrug() {
      console.log('TO BE IMPLEMENETED');
    };

    return drugs;
  }()) || _class);
});
define('client/src/views/index',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.configure = configure;
  function configure(aurelia) {

    Promise.config({ warnings: false });
    console.log = console.log.bind(console);

    aurelia.use.standardConfiguration().plugin('aurelia-animator-css').globalResources('client/src/resources/value-converters');

    aurelia.start().then(function (a) {
      return a.setRoot('client/src/views/routes');
    });
  }
});
define('client/src/views/inventory',['exports', 'aurelia-framework', '../libs/pouch', 'aurelia-router', '../libs/csv', '../resources/helpers'], function (exports, _aureliaFramework, _pouch, _aureliaRouter, _csv, _helpers) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.pendedFilterValueConverter = exports.inventoryFilterValueConverter = exports.inventory = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var inventory = exports.inventory = (_dec = (0, _aureliaFramework.inject)(_pouch.Pouch, _aureliaRouter.Router), _dec(_class = function () {
    function inventory(db, router) {
      var _this = this;

      _classCallCheck(this, inventory);

      this.db = db;
      this.router = router;
      this.csv = _csv.csv;
      this.transactions = [];
      this.pended = {};
      this.shoppingSyncPended = {};
      this.intervalId = '';

      this.placeholder = "Search by generic name, ndc, exp, or bin";
      this.waitForDrugsToIndex = _helpers.waitForDrugsToIndex;
      this.expShortcuts = _helpers.expShortcuts;
      this.clearNextProperty = _helpers.clearNextProperty;
      this.qtyShortcutsKeydown = _helpers.qtyShortcuts;
      this.removeTransactionIfQty0 = _helpers.removeTransactionIfQty0;
      this.saveTransaction = _helpers.saveTransaction;
      this.incrementBin = _helpers.incrementBin;
      this.focusInput = _helpers.focusInput;
      this.drugSearch = _helpers.drugSearch;
      this.drugName = _helpers.drugName;
      this.groupDrugs = _helpers.groupDrugs;
      this.canActivate = _helpers.canActivate;
      this.toggleDrawer = _helpers.toggleDrawer;
      this.getHistory = _helpers.getHistory;
      this.currentDate = _helpers.currentDate;
      this.reset = function ($event) {
        if ($event.newURL.slice(-9) == 'inventory') {
          _this.term = '';
          _this.setTransactions();
        }
      };
    }

    inventory.prototype.deactivate = function deactivate() {
      var _this2 = this;

      window.removeEventListener("hashchange", this.reset);
      window.removeEventListener("visibilitychange", function (_) {
        return _this2.syncPended();
      });
      clearInterval(this.intervalId);
    };

    inventory.prototype.activate = function activate(params) {
      var _this3 = this;

      window.addEventListener("hashchange", this.reset);
      window.addEventListener("visibilitychange", function (_) {
        return _this3.syncPended();
      });


      this.db.user.session.get().then(function (session) {

        _this3.user = { _id: session._id };
        _this3.account = { _id: session.account._id };

        _this3.db.user.get(_this3.user._id).then(function (user) {
          _this3.router.routes[2].navModel.setTitle(user.name.first);
        });

        _this3.db.account.get(session.account._id).then(function (account) {
          _this3.account = account;

          _this3.syncPended(1).then(function (_) {
            var keys = Object.keys(params);
            if (keys[0]) _this3.selectTerm(keys[0], params[keys[0]]);
          });

          _this3.intervalId = setInterval(function (_) {
            return _this3.syncPended();
          }, 5 * 60 * 1000);
        });
      });
    };

    inventory.prototype.syncPended = function syncPended() {
      var _this4 = this;

      var inActivate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;


      if (inActivate || document.visibilityState == 'visible') {
        console.log("syncing!");

        return this.db.transaction.query('currently-pended-by-group-priority-generic', { include_docs: true, reduce: false, startkey: [this.account._id], endkey: [this.account._id, {}] }).then(function (res) {
          _this4.pended = {};
          _this4.shoppingSyncPended = {};
          _this4.setPended(res.rows.map(function (row) {
            return row.doc;
          }));
          _this4.refreshPended();
        });
      }
    };

    inventory.prototype.clickOnGroupInDrawer = function clickOnGroupInDrawer(event, pendId) {
      if (event.target.tagName == "SPAN") {
        if (this.shoppingSyncPended[pendId].locked) return;
        this.togglePriority(pendId);
      } else {
        this.selectTerm('pended', pendId);
      }
    };

    inventory.prototype.clickOnTransactionInDrawer = function clickOnTransactionInDrawer(isReal, $event, pendKey, label) {
      if (event.target.tagName == "SPAN" && isReal) {
        this.toggleDrawerCheck(pendKey, label);
      } else if (event.target.tagName == "DIV" && !isReal) {
        this.selectTerm('pended', pendKey + ': ' + label);
      }
    };

    inventory.prototype.toggleDrawerCheck = function toggleDrawerCheck(pendId, label) {
      var _this5 = this;

      if (this.shoppingSyncPended[pendId][label].locked) return;

      this.shoppingSyncPended[pendId][label].drawerCheck = !this.shoppingSyncPended[pendId][label].drawerCheck;

      var temp_transactions = this.extractTransactions(pendId, label);

      for (var i = 0; i < temp_transactions.length; i++) {
        temp_transactions[i].next[0].pended.priority = this.shoppingSyncPended[pendId][label].drawerCheck ? false : null;
      }

      return this.db.transaction.bulkDocs(temp_transactions).catch(function (err) {
        return _this5.snackbar.error('Error removing inventory. Please reload and try again', err);
      });
    };

    inventory.prototype.togglePriority = function togglePriority(pendId) {
      var _this6 = this;

      this.shoppingSyncPended[pendId].priority = !this.shoppingSyncPended[pendId].priority;
      var transactions_to_update = this.extractTransactions(pendId, '');

      for (var i = 0; i < transactions_to_update.length; i++) {
        if (typeof transactions_to_update[i].next[0].pended.priority != 'undefined' && transactions_to_update[i].next[0].pended.priority == null) continue;
        transactions_to_update[i].next[0].pended.priority = transactions_to_update[i].next[0].pended.priority ? !transactions_to_update[i].next[0].pended.priority : true;
      }

      return this.db.transaction.bulkDocs(transactions_to_update).then(function (res) {
        console.log('priority switched for pendId:', pendId);
        console.log('results:', res);
      }).catch(function (err) {
        console.log("error with toggling priority", JSON.stringify(err));
        _this6.snackbar.error('Error toggling priority', err);
      });
    };

    inventory.prototype.toggleCheck = function toggleCheck(transaction) {
      this.setCheck(transaction, !transaction.isChecked);
    };

    inventory.prototype.toggleVisibleChecks = function toggleVisibleChecks() {
      this.setVisibleChecks(!this.filter.checked.visible);
    };

    inventory.prototype.setVisibleChecks = function setVisibleChecks(isChecked) {
      if (!this.filter) return;

      var filtered = inventoryFilterValueConverter.prototype.toView(this.transactions, this.filter);

      for (var _iterator = filtered, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
          if (_i >= _iterator.length) break;
          _ref = _iterator[_i++];
        } else {
          _i = _iterator.next();
          if (_i.done) break;
          _ref = _i.value;
        }

        var transaction = _ref;

        this.setCheck(transaction, isChecked);
      }this.filter.checked.visible = isChecked;
    };

    inventory.prototype.setCheck = function setCheck(transaction, isChecked) {

      var qty = transaction.qty.to || transaction.qty.from || 0;

      if (isChecked && !transaction.isChecked) {
        this.filter.checked.qty += qty;
        this.filter.checked.count++;
      }

      if (!isChecked && transaction.isChecked) {
        this.filter.checked.qty -= qty;
        this.filter.checked.count--;
        this.filter.checked.visible = false;
      }

      return transaction.isChecked = isChecked;
    };

    inventory.prototype.setTransactions = function setTransactions() {
      var transactions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var type = arguments[1];

      if (~['M00', 'T00', 'W00', 'R00', 'F00', 'X00', 'Y00', 'Z00'].indexOf(this.term)) transactions = transactions.sort(function (a, b) {
        if (a.drug.generic < b.drug.generic) return -1;
        if (b.drug.generic < a.drug.generic) return 1;
      });

      this.transactions = transactions;
      this.noResults = this.term && !transactions.length;
      this.filter = {};
    };

    inventory.prototype.search = function search() {
      var _this7 = this;

      console.log('search', this.term);

      if (this.isBin(this.term)) return this.selectTerm('bin', this.term);

      if (this.isExp(this.term)) return this.selectTerm('exp<', this.term, true);

      this.drugSearch().then(function (drugs) {
        console.log(drugs.length, _this7.account.ordered, _this7.account);
        _this7.groups = _this7.groupDrugs(drugs, _this7.account.ordered);
        console.log(drugs.length, _this7.groups.length, _this7.groups);
      });
    };

    inventory.prototype.isRepack = function isRepack(transaction) {
      return transaction.bin && transaction.bin.length == 3;
    };

    inventory.prototype.isBin = function isBin(term) {
      return (/^[A-Za-z][0-6]?\d[\d*]$/.test(term)
      );
    };

    inventory.prototype.isExp = function isExp(term) {
      return (/^20\d\d-\d\d-?\d?\d?$/.test(term)
      );
    };

    inventory.prototype.selectPended = function selectPended(pendedKey) {
      var _pendedKey$split = pendedKey.split(': '),
          pendId = _pendedKey$split[0],
          label = _pendedKey$split[1];

      var transactions = this.extractTransactions(pendId, label);

      if (transactions) this.term = 'Pended ' + pendedKey;

      transactions.sort(this.sortPended.bind(this));

      this.setTransactions(transactions);
      this.toggleDrawer();
    };

    inventory.prototype.extractTransactions = function extractTransactions(pendId, label) {
      var transactions = Object.values(this.pended[pendId] || {}).reduce(function (arr, pend) {
        return !label || pend.label == label ? arr.concat(pend.transactions) : arr;
      }, []);

      return transactions;
    };

    inventory.prototype.selectInventory = function selectInventory(type, key, limit) {
      var _this8 = this;

      this.term = key;

      var opts = { include_docs: true, limit: limit, reduce: false };

      if (type == 'bin' && key.length == 3) {
        var query = 'inventory-by-bin-verifiedat';
        var bin = key.split('');
        opts.startkey = [this.account._id, '', bin[0], bin[2], bin[1]];
        opts.endkey = [this.account._id, '', bin[0], bin[2], bin[1], {}];
      } else if (type == 'bin' && key[3] == '*') {
        var query = 'inventory-by-bin-verifiedat';
        var bin = key.split('');
        opts.startkey = [this.account._id, bin[0], bin[2], bin[1]];
        opts.endkey = [this.account._id, bin[0], bin[2], bin[1], {}];
      } else if (type == 'bin' && key.length == 4) {
        var query = 'inventory-by-bin-verifiedat';
        var bin = key.split('');
        opts.startkey = [this.account._id, bin[0], bin[2], bin[1], bin[3]];
        opts.endkey = [this.account._id, bin[0], bin[2], bin[1], bin[3], {}];
      } else if (type == 'exp<') {
        var query = 'expired-by-bin';

        var _key$split = key.split('-'),
            year = _key$split[0],
            month = _key$split[1];

        opts.startkey = [this.account._id, year, month];
        opts.endkey = [this.account._id, year, month + '\uFFFF'];
      } else if (type == 'generic') {
        var query = 'inventory-by-generic';

        var _currentDate = this.currentDate(limit ? 1 : 0, true),
            year = _currentDate[0],
            month = _currentDate[1];

        opts.startkey = [this.account._id, 'month', year, month, key];
        opts.endkey = [this.account._id, 'month', year, month, key, {}];
      }

      var setTransactions = function setTransactions(res) {
        if (res.rows.length == limit) {
          _this8.type = type;
          _this8.snackbar.show('Displaying first 100 results');
        } else {
          _this8.type = null;
        }

        var docs = [];
        for (var _iterator2 = res.rows, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
          var _ref2;

          if (_isArray2) {
            if (_i2 >= _iterator2.length) break;
            _ref2 = _iterator2[_i2++];
          } else {
            _i2 = _iterator2.next();
            if (_i2.done) break;
            _ref2 = _i2.value;
          }

          var row = _ref2;

          if (!row.doc.next.length || type == 'bin' && row.doc.next[0].pended && !row.doc.next[0].picked) docs.push(row.doc);else console.log('Excluded from inventory list due to next prop:', row.doc.next, row.doc);
        }

        return _this8.setTransactions(docs, type);
      };
      this.db.transaction.query(query, opts).then(setTransactions);
    };

    inventory.prototype.selectTerm = function selectTerm(type, key) {

      console.log('selectTerm', type, key);

      this.setVisibleChecks(false);
      this.repacks = [];

      type == 'pended' ? this.selectPended(key) : this.selectInventory(type, key, 100);

      this.router.navigate('inventory?' + type + '=' + key, { trigger: false });
    };

    inventory.prototype.refreshFilter = function refreshFilter(obj) {
      if (obj) obj.val.isChecked = !obj.val.isChecked;
      this.filter = Object.assign({}, this.filter);
    };

    inventory.prototype.refreshPended = function refreshPended() {
      this.pended = Object.assign({}, this.pended);
    };

    inventory.prototype.updateSelected = function updateSelected(updateFn) {
      var _this9 = this;

      var length = this.transactions.length;
      var checkedTransactions = [];

      for (var i = length - 1; i >= 0; i--) {
        var transaction = this.transactions[i];

        if (!transaction.isChecked) continue;

        checkedTransactions.unshift(transaction);

        this.setCheck(transaction, false);
        this.transactions.splice(i, 1);
        this.unsetPended(transaction);

        updateFn(transaction);
      }

      this.refreshPended();

      this.filter.checked.visible = false;

      return this.db.transaction.bulkDocs(checkedTransactions).catch(function (err) {
        return _this9.snackbar.error('Error removing inventory. Please reload and try again', err);
      });
    };

    inventory.prototype.unpendInventory = function unpendInventory() {
      var _this10 = this;

      var term = this.repacks.drug.generic;
      this.updateSelected(function (transaction) {
        var next = _this10.clearNextProperty(transaction.next, 'pended');
        transaction.isChecked = false;
        transaction.next = next;
      }).then(function (_) {
        return term ? _this10.selectTerm('generic', term) : _this10.term = '';
      });
    };

    inventory.prototype.validateGroupName = function validateGroupName(group) {
      return !~group.indexOf(": ");
    };

    inventory.prototype.pendInventory = function pendInventory(group, pendQty) {

      if (!this.validateGroupName(group)) {
        console.error('invalid group name:', group);
        return this.snackbar.show('Cannot pend to invalid group name "' + group + '"');
      }

      var toPend = [];
      var repackQty = pendQty;
      var pended_obj = { _id: new Date().toJSON(), user: this.user, repackQty: repackQty, group: group };

      var transactions_in_group = this.extractTransactions(group, '');
      console.log("other transactions already in group:", transactions_in_group);

      var should_lock = false;

      for (var i = 0; i < transactions_in_group.length; i++) {
        if (transactions_in_group[i].next[0].pended.priority) pended_obj.priority = true;
        if (transactions_in_group[i].next[0].picked && !transactions_in_group[i].next[0].picked._id) should_lock = true;
      }

      var pendId = group;

      this.updateSelected(function (transaction) {
        var next = transaction.next ? transaction.next : [{}];
        if (next.length == 0) {
          next = [{}];
        }
        next[0].pended = pended_obj;
        if (should_lock) next[0].picked = {};
        transaction.isChecked = false;
        transaction.next = next;
        toPend.push(transaction);
      });

      this.setPended(toPend);

      var label = pendId;

      if (this.repacks.drug.generic) label += ': ' + this.pended[pendId][this.repacks.drug.generic].label;

      this.selectTerm('pended', label);
    };

    inventory.prototype.pickInventory = function pickInventory(basketNumber) {
      var _this11 = this;

      if (!basketNumber.length) return;

      console.log("trying to pick into " + basketNumber);

      this.updateSelected(function (transaction) {
        console.log("picking:", transaction);

        var next = transaction.next;
        if (next.length && next[0].picked && next[0].picked._id) next[0].picked.basket = basketNumber;

        transaction.next = next;
      }).then(function (_) {
        _this11.syncPended().then(function (_) {
          _this11.selectTerm('pended', _this11.term.split(":")[0].replace("Pended ", ""));
        });
      });
    };

    inventory.prototype.sortPended = function sortPended(a, b) {

      var aPack = this.isRepack(a);
      var bPack = this.isRepack(b);

      if (aPack > bPack) return -1;
      if (aPack < bPack) return 1;

      var aBin = a.bin[0] + a.bin[2] + a.bin[1] + (a.bin[3] || '');
      var bBin = b.bin[0] + b.bin[2] + b.bin[1] + (b.bin[3] || '');

      if (aBin > bBin) return 1;
      if (aBin < bBin) return -1;

      return 0;
    };

    inventory.prototype.setPended = function setPended(transactions) {

      for (var _iterator3 = transactions, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
        var _ref3;

        if (_isArray3) {
          if (_i3 >= _iterator3.length) break;
          _ref3 = _iterator3[_i3++];
        } else {
          _i3 = _iterator3.next();
          if (_i3.done) break;
          _ref3 = _i3.value;
        }

        var transaction = _ref3;

        var pendId = this.getPendId(transaction);
        var pendQty = this.getPendQty(transaction);

        var generic = transaction.drug.generic;
        var label = generic + (pendQty ? ' - ' + pendQty : '');

        this.pended[pendId] = this.pended[pendId] || {};
        this.pended[pendId][generic] = this.pended[pendId][generic] || { label: label, transactions: [] };
        this.pended[pendId][generic].transactions.push(transaction);

        this.shoppingSyncPended[pendId] = this.shoppingSyncPended[pendId] || {};

        this.shoppingSyncPended[pendId].locked = this.shoppingSyncPended[pendId].locked == false ? false : transaction.next[0].picked ? true : false;

        this.shoppingSyncPended[pendId].priority = transaction.next[0].pended.priority ? transaction.next[0].pended.priority : false;
        this.shoppingSyncPended[pendId][label] = this.shoppingSyncPended[pendId][label] || {};
        this.shoppingSyncPended[pendId][label].drawerCheck = typeof transaction.next[0].pended.priority == 'undefined' ? true : transaction.next[0].pended.priority != null;

        this.shoppingSyncPended[pendId][label].locked = this.shoppingSyncPended[pendId].locked;
        var basketFound = transaction.next[0].picked && transaction.next[0].picked.basket;
        this.shoppingSyncPended[pendId][label].basketInfo = this.shoppingSyncPended[pendId][label].basketInfo || {};
        this.shoppingSyncPended[pendId][label].basketInfo.found = this.shoppingSyncPended[pendId][label].basketInfo.found ? this.shoppingSyncPended[pendId][label].basketInfo.found : basketFound;
        this.shoppingSyncPended[pendId][label].basketInfo.notFound = this.shoppingSyncPended[pendId][label].basketInfo.notFound ? this.shoppingSyncPended[pendId][label].basketInfo.notFound : !basketFound;
        this.shoppingSyncPended[pendId][label].basketInfo.basket = this.shoppingSyncPended[pendId][label].basketInfo.basket ? this.shoppingSyncPended[pendId][label].basketInfo.basket : basketFound ? transaction.next[0].picked.basket : null;
        if (basketFound) {
          var basket = transaction.next[0].picked.basket;
          if (!this.shoppingSyncPended[pendId][label].basketInfo.allBaskets) this.shoppingSyncPended[pendId][label].basketInfo.allBaskets = [];
          if (!~this.shoppingSyncPended[pendId][label].basketInfo.allBaskets.indexOf(basket) && transaction.next[0].picked.matchType !== 'missing') this.shoppingSyncPended[pendId][label].basketInfo.allBaskets.unshift(basket);
        }
      }
    };

    inventory.prototype.unsetPended = function unsetPended(transaction) {

      if (!transaction.next[0] || !transaction.next[0].pended) return;

      var generic = transaction.drug.generic;
      var pendId = this.getPendId(transaction);

      var i = this.pended[pendId][generic].transactions.indexOf(transaction);

      this.pended[pendId][generic].transactions.splice(i, 1);

      if (!this.pended[pendId][generic].transactions.length) delete this.pended[pendId][generic];

      if (!Object.keys(this.pended[pendId]).length) delete this.pended[pendId];
    };

    inventory.prototype.dispenseInventory = function dispenseInventory() {
      var dispensed_obj = { _id: new Date().toJSON(), user: this.user };

      this.updateSelected(function (transaction) {
        var next = transaction.next;
        if (next.length == 0) next = [{}];
        next[0].dispensed = dispensed_obj;

        transaction.next = next;
      });
    };

    inventory.prototype.disposeInventory = function disposeInventory() {
      var disposed_obj = { _id: new Date().toJSON(), user: this.user };
      this.updateSelected(function (transaction) {
        console.log("disposing:", transaction);

        var next = transaction.next;
        if (next.length == 0) next = [{}];
        next[0].disposed = disposed_obj;

        transaction.next = next;
      });
    };

    inventory.prototype.repackInventory = function repackInventory() {
      var _this12 = this;

      if (!this.repacks.drug || !this.filter.checked.count) {
        console.error('repackInventory called incorrectly. Aurelia should have disabled (problem with custom "form" attribute)', 'this.repacks.drug', this.repacks.drug, this.filter.checked.count);
        return this.snackbar.show('Repack Drug Error');
      }

      var total = this.repacks.reduce(function (total, repack) {
        return total + repack;
      }, 0);
      if (total > this.repacks.excessQty) {
        console.error('repackInventory quantity is incorrect. ', 'this.repacks.excessQty', this.repacks.excessQty, 'this.repacks', this.repacks);
        return this.snackbar.show('Repack Qty Error');
      }

      var next = this.transactions[0].next && this.transactions[0].next.pended ? [{ pended: this.transactions[0].next[0].pended }] : [];

      var newTransactions = [],
          createdAt = new Date().toJSON();

      newTransactions.push({
        exp: { to: this.repacks[0].exp, from: null },
        qty: { to: this.repacks.excessQty, from: null },
        user: this.user,
        shipment: { _id: this.account._id },
        drug: this.repacks.drug,
        next: [{ disposed: { _id: new Date().toJSON(), user: this.user } }]
      });

      for (var _iterator4 = this.repacks, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
        var _ref4;

        if (_isArray4) {
          if (_i4 >= _iterator4.length) break;
          _ref4 = _iterator4[_i4++];
        } else {
          _i4 = _iterator4.next();
          if (_i4.done) break;
          _ref4 = _i4.value;
        }

        var repack = _ref4;


        if (!repack.bin || !repack.exp || !repack.qty) continue;

        var newTransaction = {
          exp: { to: repack.exp, from: null },
          qty: { to: +repack.qty, from: null },
          user: this.user,
          shipment: { _id: this.account._id },
          bin: repack.bin,
          drug: this.repacks.drug,
          next: []
        };

        if (this.term.slice(0, 7) != 'Pended') this.transactions.unshift(newTransaction);

        newTransactions.push(newTransaction);
      }

      console.log('newTransaction', this.repacks.length, this.repacks, newTransactions.length, newTransactions);

      this.db.transaction.bulkDocs(newTransactions).then(function (rows) {
        var errors = [];
        for (var i = rows.length - 1; i >= 0; i--) {
          if (!rows[i].error) continue;
          if (!errors.includes(rows[i].message)) errors.push(rows[i].message);
          _this12.transactions.splice(i, 1);
        }

        if (errors.length) {
          console.error('Repacked vials could not be created', errors, rows);
          return _this12.snackbar.show('Repack error ' + errors.join(', '));
        }

        console.log('Repacked vials have been created', rows);

        var repacked_obj = { _id: new Date().toJSON(), user: _this12.user, transactions: [] };

        var transactions_arr = rows.map(function (row) {
          return { _id: row.id };
        });

        repacked_obj.transactions = transactions_arr;

        _this12.updateSelected(function (transaction) {
          var temp_next = transaction.next;
          if (temp_next.length == 0) temp_next = [{}];
          temp_next[0].repacked = repacked_obj;
          transaction.next = temp_next;
        });

        _this12.printLabels(newTransactions.slice(1));
      }).catch(function (err) {
        console.error(err);
        _this12.snackbar.show('Transactions could not repackaged: ' + err.reason);
      });
    };

    inventory.prototype.getPendId = function getPendId(transaction) {
      if (transaction) {

        var pendId = transaction.next[0] ? transaction.next[0].pended.group : null;
        var created = transaction.next[0] ? transaction.next[0].pended._id : transaction._id;

        return pendId ? pendId : created.slice(5, 16).replace('T', ' ');
      }

      return this.term.replace('Pended ', '').split(': ')[0];
    };

    inventory.prototype.getPendQty = function getPendQty(transaction) {
      if (transaction) {
        var pendId = transaction.next[0] ? transaction.next[0].pended.repackQty : null;
        return pendId ? pendId : undefined;
      }

      return this.term.split(' - ')[1];
    };

    inventory.prototype.printLabels = function printLabels(transactions) {

      transactions = transactions || this.transactions.filter(function (t) {
        return t.isChecked;
      });
      var pendId = this.getPendId();
      var numDrugs = '?';

      if (this.shoppingSyncPended[pendId]) numDrugs = Object.keys(this.shoppingSyncPended[pendId]).length - 2;else console.log(pendId, this.pended, this.shoppingSyncPended);

      var labels = transactions.map(function (transaction) {
        return ['<p style="page-break-after:always; white-space:nowrap">', '<strong>' + transaction.drug.generic + '</strong>', transaction._id.slice(2, -1), 'Ndc ' + transaction.drug._id, 'Exp ' + transaction.exp.to.slice(0, 7), 'Bin ' + transaction.bin, 'Qty ' + transaction.qty.to, pendId + ', #' + numDrugs, 'Pharmacist ________________', '</p>'].join('<br>');
      });

      var win = window.open();
      if (!win) return this.snackbar.show('Enable browser pop-ups to print vial labels');

      win.document.write(labels.join(''));
      win.print();
      win.close();
    };

    inventory.prototype.saveAndReconcileTransaction = function saveAndReconcileTransaction(transaction) {
      var _this13 = this;

      console.log('saveAndReconcileTransaction');

      this.db.transaction.get(transaction._id).then(function (repack) {
        var qtyChange = transaction.qty.to - repack.qty.to;

        if (!qtyChange) {
          return _this13.saveTransaction(transaction);
        }

        _this13.transactions = _this13.transactions.slice();

        if (transaction.isChecked) _this13.filter.checked.qty += qtyChange;

        console.log('saveAndReconcileTransaction', qtyChange, transaction.qty.to, repack.qty.to);

        return _this13.db.transaction.query('next.transaction._id', { key: [_this13.account._id, transaction._id], include_docs: true }).then(function (res) {

          if (!res.rows.length) {
            return _this13.saveTransaction(transaction);
          }

          var excess = res.rows.pop().doc.next.pop().transaction._id;

          return _this13.db.transaction.get(excess).then(function (excess) {
            excess.qty.to -= qtyChange;

            if (excess.qty.to < 0) {
              transaction.qty.to = repack.qty.to;
              return _this13.snackbar.show('Cannot set repack qty to be more than qty orginally repacked, ' + (repack.qty.to + excess.qty.to + qtyChange));
            }

            _this13.db.transaction.put(excess);
            return _this13.saveTransaction(transaction);
          });
        });
      });
    };

    inventory.prototype.setRepackRows = function setRepackRows(repack, $last, $index) {

      console.log('setRepackRows', repack, $index, $last, this.repacks.length);

      if (!$last && !repack.qty) {
        this.repacks.splice($index, 1);
        this.menu.resize();
      }

      if ($last && repack.qty) {
        this.repacks.push({});
        this.menu.resize();
        if (!repack.exp) repack.exp = this.repacks[$index - 1].exp;

        if (!repack.bin) repack.bin = this.repacks[$index - 1].bin;
      }

      this.setExcessQty();
    };

    inventory.prototype.setRepackQty = function setRepackQty() {
      var qtyInPendId = this.getPendQty() || 30 * Math.floor(this.filter.checked.qty / 30);
      var qtyRemainder = this.filter.checked.qty - qtyInPendId;
      qtyInPendId && this.repacks.push({ exp: this.repacks.exp, qty: qtyInPendId });
      qtyRemainder && this.repacks.push({ exp: this.repacks.exp, qty: qtyRemainder });
    };

    inventory.prototype.setExcessQty = function setExcessQty() {
      var repackQty = this.repacks.reduce(function (totalQty, repack) {
        return Math.max(0, repack.qty || 0) + totalQty;
      }, 0);
      this.repacks.excessQty = this.filter.checked.qty - repackQty;
    };

    inventory.prototype.exportCSV = function exportCSV() {
      var _this14 = this;

      var _currentDate2 = this.currentDate(-1, true),
          year = _currentDate2[0],
          month = _currentDate2[1],
          day = _currentDate2[2];

      var name = 'Inventory ' + year + '-' + month + '-' + day + '.csv';
      var opts = {
        reduce: false,
        startkey: [this.account._id, 'month', year, month],
        endkey: [this.account._id, 'month', year, month + '\uFFFF']
      };

      this.db.transaction.query('inventory-by-generic', opts).then(function (transactions) {
        _this14.csv.fromJSON(name, transactions.rows.map(function (row) {
          return {
            'drug.generic': row.key[4],
            'drug.gsns': row.key[5],
            'drug.brand': row.key[6],
            'drug._id': row.key[7],
            'exp.to': row.key[8],
            'qty.to': row.value[0],
            'val.to': row.value[1],
            'bin': row.key[10],
            '_id': row.id
          };
        }));
      });
    };

    inventory.prototype.openMenu = function openMenu($event) {
      console.log('openMenu called', $event.target.tagName, this.transactions.length, !this.transactions.length, this.repacks, $event);

      if (this.repacks.length && $event.target.tagName != 'I' && $event.target.tagName != 'BUTTON' && $event.target.tagName != 'UL' && $event.target.tagName != 'MD-MENU') return true;

      if (!this.transactions.length) {
        console.log('openMenu transactions.length == 0', this.repacks);
        return true;
      }

      var term = this.term.replace('Pended ', '');

      this.pendToId = '';
      this.pendToQty = '';
      this.basketNumber = '';
      this.repacks = this.setRepacks();
      this.matches = this.setMatchingPends(this.repacks.drug);

      if (this.repacks.drug) {
        this.setRepackQty();
        this.setExcessQty();
      }

      console.log('openMenu', this.account.ordered[this.term], this.repacks);
    };

    inventory.prototype.setMatchingPends = function setMatchingPends(drug) {

      var matches = [];
      var pendId = this.getPendId();

      if (drug) for (var pendToId in this.pended) {
        var match = this.pended[pendToId][drug.generic];
        if (pendId != pendToId && match) matches.push({ pendId: pendToId, pendQty: this.getPendQty(match.transactions[0]) });
      }
      return matches;
    };

    inventory.prototype.setRepacks = function setRepacks() {
      var repacks = [];
      repacks.exp = '';
      repacks.drug = null;

      for (var _iterator5 = this.transactions, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
        var _ref5;

        if (_isArray5) {
          if (_i5 >= _iterator5.length) break;
          _ref5 = _iterator5[_i5++];
        } else {
          _i5 = _iterator5.next();
          if (_i5.done) break;
          _ref5 = _i5.value;
        }

        var transaction = _ref5;


        if (!transaction.isChecked) continue;

        if (repacks.drug == null) {
          repacks.drug = JSON.parse(JSON.stringify(transaction.drug));
          repacks.drug.price = { goodrx: 0, nadac: 0, retail: 0, updatedAt: new Date().toJSON() };
          console.log('this.repacks.drug is null', repacks.drug);
        } else if (repacks.drug._id != transaction.drug._id) {
          console.error('this.repacks.drug mismatch', repacks.drug, transaction.drug);
          repacks.drug = false;
          this.snackbar.show('Warning: Mismatched NDCs');
          break;
        }

        repacks.drug.price.goodrx += transaction.drug.price.goodrx * transaction.qty.to / this.filter.checked.qty;
        repacks.drug.price.nadac += transaction.drug.price.nadac * transaction.qty.to / this.filter.checked.qty;
        repacks.drug.price.retail += transaction.drug.price.retail * transaction.qty.to / this.filter.checked.qty;
        console.log('setRepacks weighted price', repacks.drug.price.goodrx, transaction.drug.price.goodrx, transaction.qty.to, this.filter.checked.qty);

        repacks.exp = repacks.exp && repacks.exp < transaction.exp.to ? repacks.exp : transaction.exp.to;
      }

      return repacks;
    };

    inventory.prototype.qtyShortcutsInput = function qtyShortcutsInput($event, $index) {
      this.removeTransactionIfQty0($event, $index);
    };

    inventory.prototype.binShortcuts = function binShortcuts($event, $index) {
      if ($event.which == 13) this.focusInput('#exp_' + ($index + 1));else this.incrementBin($event, this.transactions[$index]);

      return true;
    };

    inventory.prototype.showHistoryDialog = function showHistoryDialog(_id) {
      var _this15 = this;

      console.log('getHistory', _id);
      this.history = 'Loading...';
      this.dialog.showModal();
      this.getHistory(_id).then(function (history) {
        console.log(history);
        _this15.history = history;
      });
    };

    inventory.prototype.closeHistoryDialog = function closeHistoryDialog() {
      this.dialog.close();
    };

    return inventory;
  }()) || _class);

  var inventoryFilterValueConverter = exports.inventoryFilterValueConverter = function () {
    function inventoryFilterValueConverter() {
      _classCallCheck(this, inventoryFilterValueConverter);
    }

    inventoryFilterValueConverter.prototype.toView = function toView() {
      var transactions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var filter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var term = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

      var ndcFilter = {};
      var expFilter = {};
      var repackFilter = {};
      var formFilter = {};
      var checkVisible = true;
      var oneMonthFromNow = (0, _helpers.currentDate)(1);
      var isBin = inventory.prototype.isBin(term);
      var defaultCheck = isBin || inventory.prototype.isExp(term);

      filter.checked = filter.checked || {};
      filter.checked.qty = filter.checked.qty || 0;
      filter.checked.count = filter.checked.count || 0;

      transactions = transactions.filter(function (transaction, i) {
        var qty = transaction.qty.to || transaction.qty.from;
        var exp = (transaction.exp.to || transaction.exp.from || oneMonthFromNow).slice(0, 7);
        var ndc = transaction.drug._id;
        var form = transaction.drug.form;
        var repack = inventory.prototype.isRepack(transaction) ? 'Repacked' : 'Inventory';
        var isExp = exp > oneMonthFromNow ? 'Unexpired' : 'Expired';
        var pended = transaction.next[0] && transaction.next[0].pended;

        if (!expFilter[exp]) {
          expFilter[exp] = { isChecked: filter.exp && filter.exp[exp] ? filter.exp[exp].isChecked : defaultCheck || pended || false, count: 0, qty: 0 };
        }

        if (!expFilter[isExp]) {
          expFilter[isExp] = { isChecked: filter.exp && filter.exp[isExp] ? filter.exp[isExp].isChecked : isBin && isExp == 'Unexpired' && term[3] == '*' ? false : true, count: 0, qty: 0 };
        }

        if (!ndcFilter[ndc]) ndcFilter[ndc] = { isChecked: filter.ndc && filter.ndc[ndc] ? filter.ndc[ndc].isChecked : defaultCheck || pended || !i, count: 0, qty: 0 };

        if (!formFilter[form]) formFilter[form] = { isChecked: filter.form && filter.form[form] ? filter.form[form].isChecked : defaultCheck || pended || !i, count: 0, qty: 0 };

        if (!repackFilter[repack]) repackFilter[repack] = { isChecked: filter.repack && filter.repack[repack] ? filter.repack[repack].isChecked : defaultCheck || pended || !repackFilter['Repacked'], count: 0, qty: 0 };

        if (!expFilter[isExp].isChecked) {
          if (expFilter[exp].isChecked && ndcFilter[ndc].isChecked && formFilter[form].isChecked && repackFilter[repack].isChecked) {
            expFilter[isExp].count++;
            expFilter[isExp].qty += qty;
          }

          return inventory.prototype.setCheck.call({ filter: filter }, transaction, false);
        }

        if (!expFilter[exp].isChecked) {
          if (expFilter[isExp].isChecked && ndcFilter[ndc].isChecked && formFilter[form].isChecked && repackFilter[repack].isChecked) {
            expFilter[exp].count++;
            expFilter[exp].qty += qty;
          }

          return inventory.prototype.setCheck.call({ filter: filter }, transaction, false);
        }

        if (!ndcFilter[ndc].isChecked) {
          if (expFilter[isExp].isChecked && expFilter[exp].isChecked && formFilter[form].isChecked && repackFilter[repack].isChecked) {
            ndcFilter[ndc].count++;
            ndcFilter[ndc].qty += qty;
          }

          return inventory.prototype.setCheck.call({ filter: filter }, transaction, false);
        }

        if (!formFilter[form].isChecked) {
          if (expFilter[isExp].isChecked && expFilter[exp].isChecked && ndcFilter[ndc].isChecked && repackFilter[repack].isChecked) {
            formFilter[form].count++;
            formFilter[form].qty += qty;
          }
          return inventory.prototype.setCheck.call({ filter: filter }, transaction, false);
        }

        if (!repackFilter[repack].isChecked) {
          if (expFilter[isExp].isChecked && expFilter[exp].isChecked && ndcFilter[ndc].isChecked && formFilter[form].isChecked) {
            repackFilter[repack].count++;
            repackFilter[repack].qty += qty;
          }

          return inventory.prototype.setCheck.call({ filter: filter }, transaction, false);
        }

        if (!transaction.isChecked) checkVisible = false;

        expFilter[isExp].count++;
        expFilter[isExp].qty += qty;

        expFilter[exp].count++;
        expFilter[exp].qty += qty;

        ndcFilter[ndc].count++;
        ndcFilter[ndc].qty += qty;

        formFilter[form].count++;
        formFilter[form].qty += qty;

        repackFilter[repack].count++;
        repackFilter[repack].qty += qty;

        return true;
      });

      filter.exp = expFilter;
      filter.ndc = ndcFilter;
      filter.form = formFilter;
      filter.repack = repackFilter;
      filter.checked.visible = transactions.length ? checkVisible : false;

      return transactions;
    };

    return inventoryFilterValueConverter;
  }();

  var pendedFilterValueConverter = exports.pendedFilterValueConverter = function () {
    function pendedFilterValueConverter() {
      _classCallCheck(this, pendedFilterValueConverter);
    }

    pendedFilterValueConverter.prototype.toView = function toView() {
      var pended = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var term = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

      term = term.toLowerCase();
      var matches = [];
      for (var pendId in pended) {
        if (~pendId.toLowerCase().indexOf(term)) {
          matches.unshift({ key: pendId, val: pended[pendId] });
          continue;
        }

        var basketMatches = {};

        for (var generic in pended[pendId]) {
          var transactions = pended[pendId][generic].transactions;
          for (var i = 0; i < transactions.length; i++) {
            if (transactions[i].next[0].picked && transactions[i].next[0].picked.basket && ~transactions[i].next[0].picked.basket.toLowerCase().indexOf(term)) {
              basketMatches[generic] = pended[pendId][generic];
            }
          }
        }

        if (Object.keys(basketMatches).length) matches.unshift({ key: pendId, val: basketMatches });

        var genericMatches = {};

        for (var _generic in pended[pendId]) {
          if (~_generic.toLowerCase().indexOf(term)) genericMatches[_generic] = pended[pendId][_generic];
        }if (Object.keys(genericMatches).length) matches.unshift({ key: pendId, val: genericMatches });
      }

      return matches;
    };

    return pendedFilterValueConverter;
  }();
});
define('client/src/views/join',['exports', 'aurelia-framework', 'aurelia-router', '../libs/pouch', 'aurelia-http-client', '../resources/helpers'], function (exports, _aureliaFramework, _aureliaRouter, _pouch, _aureliaHttpClient, _helpers) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.join = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var join = exports.join = (_dec = (0, _aureliaFramework.inject)(_pouch.Pouch, _aureliaRouter.Router, _aureliaHttpClient.HttpClient), _dec(_class = function () {
    function join(db, router, http) {
      _classCallCheck(this, join);

      this.db = db;
      this.router = router;
      this.http = http;

      this.account = {
        name: '',
        license: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        ordered: {}
      };

      this.user = {
        name: { first: '', last: '' },
        phone: ''
      };
      this.canActivate = _helpers.canActivate;
    }

    join.prototype.join = function join() {
      var _this = this;

      this.disabled = true;
      this.user.account = { _id: this.account.phone };

      this.db.user.post(this.user).then(function (res) {
        console.log('this.db.user.post success', res, _this.user);
        return _this.db.account.post(_this.account);
      }).then(function (res) {
        console.log('this.db.account.post success', res, _this.account);
        return new Promise(function (resolve) {
          return setTimeout(resolve, 5000);
        });
      }).then(function (_) {
        return _this.db.user.session.post(_this.user);
      }).then(function (loading) {
        console.log('this.db.user.session.post success', loading);

        _this.loading = loading.resources;
        _this.progress = loading.progress;

        return Promise.all(loading.syncing);
      }).then(function (_) {
        console.log('join success', _);
        return _this.router.navigate('shipments');
      }).catch(function (err) {
        _this.disabled = false;

        err.account = _this.account;
        err.user = _this.user;

        if (err.message == "Document update conflict") err.message = "phone number must be unique";

        _this.snackbar.error('Join failed', err);
      });
    };

    return join;
  }()) || _class);
});
define('client/src/views/login',['exports', 'aurelia-framework', 'aurelia-router', '../libs/pouch', '../resources/helpers'], function (exports, _aureliaFramework, _aureliaRouter, _pouch, _helpers) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.login = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var login = exports.login = (_dec = (0, _aureliaFramework.inject)(_pouch.Pouch, _aureliaRouter.Router), _dec(_class = function () {
    function login(db, router) {
      _classCallCheck(this, login);

      this.db = db;
      this.router = router;
      this.phone = '';
      this.password = '';
      this.canActivate = _helpers.canActivate;
    }

    login.prototype.login = function login() {
      var _this = this;

      this.db.user.session.post({ phone: this.phone, password: this.password }).then(function (loading) {
        _this.disabled = true;

        _this.loading = loading.resources;
        _this.progress = loading.progress;

        return Promise.all(loading.syncing);
      }).then(function (resources) {
        _this.router.navigate('picking');
      }).catch(function (err) {
        _this.disabled = false;
        _this.snackbar.error('Login failed', err);
      });
    };

    return login;
  }()) || _class);
});
define('client/src/views/picking',['exports', 'aurelia-framework', '../libs/pouch', 'aurelia-router', '../resources/helpers'], function (exports, _aureliaFramework, _pouch, _aureliaRouter, _helpers) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.pendedFilterValueConverter = exports.shopping = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var shopping = exports.shopping = (_dec = (0, _aureliaFramework.inject)(_pouch.Pouch, _aureliaRouter.Router), _dec(_class = function () {
    function shopping(db, router) {
      _classCallCheck(this, shopping);

      this.db = db;
      this.router = router;

      this.groups = [];
      this.shopList = [];
      this.shoppingIndex = -1;
      this.nextButtonText = '';
      this.orderSelectedToShop = false;
      this.formComplete = false;
      this.basketSaved = false;
      this.currentCart = '';
      this.basketOptions = ['S', 'R', 'G', 'B'];
      this.focusInput = _helpers.focusInput;

      this.canActivate = _helpers.canActivate;
      this.currentDate = _helpers.currentDate;
      this.clearNextProperty = _helpers.clearNextProperty;
    }

    shopping.prototype.deactivate = function deactivate() {};

    shopping.prototype.canDeactivate = function canDeactivate() {
      return confirm('Confirm you want to leave page');
    };

    shopping.prototype.activate = function activate(params) {
      var _this = this;

      this.db.user.session.get().then(function (session) {
        console.log('user acquired');
        _this.user = { _id: session._id };
        _this.account = { _id: session.account._id };

        _this.db.user.get(_this.user._id).then(function (user) {
          _this.router.routes[2].navModel.setTitle(user.name.first);
        });

        if (!_this.account.hazards) _this.account.hazards = {};
        console.log('about to call refresh first time');
        _this.refreshPendedGroups();
      }).catch(function (err) {
        console.log("error getting user session:", JSON.stringify({ status: err.status, message: err.message, reason: err.reason, stack: err.stack }));
        return confirm('Error getting user session, info below or console. Click OK to continue. ' + JSON.stringify({ status: err.status, message: err.message, reason: err.reason, stack: err.stack }));
      });
    };

    shopping.prototype.updatePickedCount = function updatePickedCount() {
      var _this2 = this;

      var date = new Date();

      var _date$toJSON$split$0$ = date.toJSON().split('T')[0].split('-'),
          year = _date$toJSON$split$0$[0],
          month = _date$toJSON$split$0$[1],
          day = _date$toJSON$split$0$[2];

      this.db.transaction.query('picked-by-user-from-shipment', { startkey: [this.account._id, this.user._id, year, month, day], endkey: [this.account._id, this.user._id, year, month, day, {}] }).then(function (res) {
        console.log(res);
        _this2.pickedCount = res.rows[0].value[0].count;
      });
    };

    shopping.prototype.refreshPendedGroups = function refreshPendedGroups() {
      var _this3 = this;

      console.log('refreshing');

      this.updatePickedCount();

      this.db.account.picking['post']({ action: 'refresh' }).then(function (res) {
        _this3.groups = res;
      }).catch(function (err) {
        console.log("error refreshing pended groups:", JSON.stringify({ status: err.status, message: err.message, reason: err.reason, stack: err.stack }));
        return confirm('Error refreshing pended groups, info below or console. Click OK to continue. ' + JSON.stringify({ status: err.status, message: err.message, reason: err.reason, stack: err.stack }));
      });
    };

    shopping.prototype.unlockGroup = function unlockGroup(groupName, el) {
      var _this4 = this;

      for (var i = 0; i < this.groups.length; i++) {
        if (this.groups[i].name == groupName) this.groups[i].locked = 'unlocking';
      }

      var start = Date.now();
      console.log(groupName);

      this.db.account.picking.post({ groupName: groupName, action: 'unlock' }).then(function (res) {
        _this4.groups = res;
      }).catch(function (err) {
        console.log("error unlocking order:", (Date.now() - start) / 1000, 'seconds', JSON.stringify({ status: err.status, message: err.message, reason: err.reason, stack: err.stack }));
        return confirm('Error unlocking order, info below or console. Click OK to continue. ' + JSON.stringify({ status: err.status, message: err.message, reason: err.reason, stack: err.stack }));
      });
    };

    shopping.prototype.selectGroup = function selectGroup(isLocked, groupName) {
      var _this5 = this;

      if (isLocked || groupName.length == 0) return;

      this.groupLoaded = false;
      this.orderSelectedToShop = true;

      var start = Date.now();

      this.db.account.picking.post({ groupName: groupName, action: 'load' }).then(function (res) {
        console.log("result of loading: " + res.length, (Date.now() - start) / 1000, 'seconds');
        _this5.shopList = res;
        _this5.pendedFilter = '';
        _this5.filter = {};
        _this5.initializeShopper();
      }).catch(function (err) {
        if (~err.message.indexOf('Unexpected end of JSON input') || ~err.message.indexOf('Unexpected EOF')) {
          var res = confirm("Seems this order is no longer available to shop or someone locked it down. Click OK to refresh available groups. If this persists, contact Adam / Aminata");
          _this5.refreshPendedGroups();
          _this5.resetShopper();
        } else {
          console.log("error loading order:", JSON.stringify({ status: err.status, message: err.message, reason: err.reason, stack: err.stack }));
          return confirm('Error loading group, info below or console. Click OK to continue. ' + JSON.stringify({ status: err.status, message: err.message, reason: err.reason, stack: err.stack }));
        }
      });
    };

    shopping.prototype.initializeShopper = function initializeShopper() {
      this.shoppingIndex = 0;
      this.groupLoaded = true;

      if (this.shopList.length == 1) {
        this.setNextToSave();
      } else {
        this.setNextToNext();
      }

      this.addBasket(this.shoppingIndex);
    };

    shopping.prototype.resetShopper = function resetShopper() {
      this.orderSelectedToShop = false;
      this.formComplete = false;
      this.updatePickedCount();
    };

    shopping.prototype.saveShoppingResults = function saveShoppingResults(arr_enriched_transactions, key) {
      var _this6 = this;

      var transactions_to_save = this.prepResultsToSave(arr_enriched_transactions, key);

      console.log("attempting to save these transactions", JSON.stringify(transactions_to_save));
      var startTime = new Date().getTime();

      return this.db.transaction.bulkDocs(transactions_to_save).then(function (res) {
        var completeTime = new Date().getTime();
        console.log("results of saving in " + (completeTime - startTime) + " ms", JSON.stringify(res));
      }).catch(function (err) {

        var completeTime = new Date().getTime();
        console.log("error saving in " + (completeTime - startTime) + "ms:", JSON.stringify({ status: err.status, message: err.message, reason: err.reason, stack: err.stack }));

        if (err.status == 0) {

          console.log("going to try and save one more time, in case it was just connectivity " + JSON.stringify(transactions_to_save));

          return _this6.delay(3000).then(function (_) {

            console.log("waiting finished, sending again");

            return _this6.db.transaction.bulkDocs(transactions_to_save).then(function (res) {
              var finalTime = new Date().getTime();
              console.log("succesful second saving in " + (finalTime - completeTime) + " ms", JSON.stringify(res));
            }).catch(function (err) {
              console.log("saving: empty object error the second time");
              return confirm('Error saving item on second attempt. Error object: ' + JSON.stringify({ status: err.status, message: err.message, reason: err.reason, stack: err.stack }));
            });
          });
        } else {

          _this6.snackbar.error('Error loading/saving. Contact Adam', err);
          return confirm('Error saving item, info below or console. Click OK to continue. ' + JSON.stringify({ status: err.status, message: err.message, reason: err.reason, stack: err.stack }));
        }
      });
    };

    shopping.prototype.prepResultsToSave = function prepResultsToSave(arr_enriched_transactions, key) {

      if (arr_enriched_transactions.length == 0) return Promise.resolve();

      var transactions_to_save = [];

      for (var i = 0; i < arr_enriched_transactions.length; i++) {

        var reformated_transaction = arr_enriched_transactions[i].raw;
        var next = reformated_transaction.next;

        if (next[0]) {
          if (key == 'shopped') {
            var outcome = this.getOutcome(arr_enriched_transactions[i].extra);

            next[0].picked = {
              _id: new Date().toJSON(),
              basket: arr_enriched_transactions[i].extra.fullBasket,
              repackQty: next[0].pended.repackQty ? next[0].pended.repackQty : reformated_transaction.qty.to ? reformated_transaction.qty.to : reformated_transaction.qty.from,
              matchType: outcome,
              user: this.user
            };
          } else if (key == 'unlock') {

            delete next[0].picked;
          } else if (key == 'lockdown') {

            next[0].picked = {};
          }
        }

        reformated_transaction.next = next;
        transactions_to_save.push(reformated_transaction);
      }

      return transactions_to_save;
    };

    shopping.prototype.saveBasketNumber = function saveBasketNumber() {
      console.log("saving basket");
      this.basketSaved = true;
      this.shopList[this.shoppingIndex].extra.fullBasket = this.shopList[this.shoppingIndex].extra.basketLetter + this.shopList[this.shoppingIndex].extra.basketNumber;
      if (this.shopList[this.shoppingIndex].extra.basketLetter != 'G' && this.currentCart != this.shopList[this.shoppingIndex].extra.basketNumber[0]) this.currentCart = this.shopList[this.shoppingIndex].extra.basketNumber[0];
      this.gatherBaskets(this.shopList[this.shoppingIndex].raw.drug.generic);
      console.log(this.currentCart);
    };

    shopping.prototype.gatherBaskets = function gatherBaskets(generic) {
      var list_of_baskets = '';
      for (var i = 0; i < this.shopList.length; i++) {
        if (this.shopList[i].extra.fullBasket && !~list_of_baskets.indexOf(this.shopList[i].extra.fullBasket) && this.shopList[i].raw.drug.generic == generic) list_of_baskets += ',' + this.shopList[i].extra.fullBasket;
      }
      this.currentGenericBaskets = list_of_baskets;
    };

    shopping.prototype.addBasket = function addBasket(index) {
      this.basketSaved = false;
      if (this.shopList[index].extra.basketLetter != 'G') this.shopList[index].extra.basketNumber = this.currentCart;
    };

    shopping.prototype.delay = function delay(ms) {
      return new Promise(function (resolve) {
        return setTimeout(resolve, ms);
      });
    };

    shopping.prototype.moveShoppingForward = function moveShoppingForward() {
      var _this7 = this;

      if (this.getOutcome(this.shopList[this.shoppingIndex].extra) == 'missing' && this.shopList[this.shoppingIndex].extra.saved != 'missing') {

        this.formComplete = false;
        this.setNextToLoading();

        console.log("missing item! sending request to server to compensate for:", this.shopList[this.shoppingIndex].raw.drug.generic);

        this.db.account.picking['post']({ groupName: this.shopList[this.shoppingIndex].raw.next[0].pended.group, action: 'missing_transaction', ndc: this.shopList[this.shoppingIndex].raw.drug._id, generic: this.shopList[this.shoppingIndex].raw.drug.generic, qty: this.shopList[this.shoppingIndex].raw.qty.to, repackQty: this.shopList[this.shoppingIndex].raw.next[0].pended.repackQty }).then(function (res) {

          if (res.length > 0) {

            _this7.shopList[_this7.shoppingIndex].extra.saved = 'missing';

            for (var j = 0; j < res.length; j++) {

              var n = _this7.shoppingIndex - (_this7.shopList[_this7.shoppingIndex].extra.genericIndex.relative_index[0] - 1);
              if (n < 0) n = 0;
              var inserted = false;

              for (n; n < _this7.shopList.length; n++) {

                if (_this7.shopList[n].raw.drug.generic == res[j].raw.drug.generic) {
                  _this7.shopList[n].extra.genericIndex.relative_index[1]++;
                } else {
                  res[j].extra.genericIndex = { global_index: _this7.shopList[n - 1].extra.genericIndex.global_index, relative_index: [_this7.shopList[n - 1].extra.genericIndex.relative_index[0] + 1, _this7.shopList[n - 1].extra.genericIndex.relative_index[1]] };
                  _this7.shopList.splice(n, 0, res[j]);
                  inserted = true;
                  n = _this7.shopList.length;
                }
              }

              if (!inserted) {
                res[j].extra.genericIndex = { global_index: _this7.shopList[n - 1].extra.genericIndex.global_index, relative_index: [_this7.shopList[n - 1].extra.genericIndex.relative_index[0] + 1, _this7.shopList[n - 1].extra.genericIndex.relative_index[1]] };
                _this7.shopList.push(res[j]);
              }
            }
          } else {
            console.log("couldn't find item with same or greater qty to replace this");
          }

          _this7.advanceShopping();
        }).catch(function (err) {
          console.log("error compensating for missing:", JSON.stringify({ status: err.status, message: err.message, reason: err.reason, stack: err.stack }));
          return confirm('Error handling a missing item, info below or console. Click OK to continue. ' + JSON.stringify({ status: err.status, message: err.message, reason: err.reason, stack: err.stack }));
        });
      } else {
        this.advanceShopping();
      }
    };

    shopping.prototype.advanceShopping = function advanceShopping() {
      var _this8 = this;

      if (this.shoppingIndex == this.shopList.length - 1) {

        this.saveShoppingResults([this.shopList[this.shoppingIndex]], 'shopped').then(function (_) {
          _this8.refreshPendedGroups();
        });

        for (var i = this.groups.length - 1; i >= 0; i--) {
          if (this.groups[i].name == this.shopList[this.shoppingIndex].raw.next[0].pended.group) {
            this.groups.splice(i, 1);
            break;
          }
        }

        this.resetShopper();
      } else {

        if (!this.shopList[this.shoppingIndex + 1].extra.fullBasket) {
          if (this.shopList[this.shoppingIndex].raw.drug.generic == this.shopList[this.shoppingIndex + 1].raw.drug.generic) {
            this.shopList[this.shoppingIndex + 1].extra.basketLetter = this.shopList[this.shoppingIndex].extra.basketLetter;
            this.shopList[this.shoppingIndex + 1].extra.fullBasket = this.shopList[this.shoppingIndex].extra.fullBasket;
          } else {
            this.addBasket(this.shoppingIndex + 1);
          }
        } else if (this.shopList[this.shoppingIndex].raw.drug.generic != this.shopList[this.shoppingIndex + 1].raw.drug.generic) {
          this.gatherBaskets(this.shopList[this.shoppingIndex + 1].raw.drug.generic);
        }

        this.saveShoppingResults([this.shopList[this.shoppingIndex]], 'shopped');
        this.shoppingIndex += 1;

        if (this.shoppingIndex == this.shopList.length - 1) {
          this.setNextToSave();
        } else {
          this.setNextToNext();
        }

        this.formComplete = this.shopList[this.shoppingIndex].extra.fullBasket && this.someOutcomeSelected(this.shopList[this.shoppingIndex].extra.outcome);
      }
    };

    shopping.prototype.moveShoppingBackward = function moveShoppingBackward() {
      if (this.shoppingIndex == 0) return;
      if (this.shopList[this.shoppingIndex - 1].raw.drug.generic != this.shopList[this.shoppingIndex].raw.drug.generic) this.gatherBaskets(this.shopList[this.shoppingIndex - 1].raw.drug.generic);
      this.setNextToNext();
      this.shoppingIndex -= 1;
      this.formComplete = true;
    };

    shopping.prototype.pauseShopping = function pauseShopping(groupName) {

      this.resetShopper();
      this.unlockGroup(groupName);

      this.refreshPendedGroups();
    };

    shopping.prototype.skipItem = function skipItem() {

      if (this.shoppingIndex == this.shopList.length - 1 || this.shopList[this.shoppingIndex + 1].raw.drug.generic !== this.shopList[this.shoppingIndex].raw.drug.generic) return this.snackbar.show('Cannot skip last item of generic');

      this.shopList[this.shoppingIndex].extra.genericIndex.relative_index[0] = this.shopList[this.shoppingIndex].extra.genericIndex.relative_index[1];

      for (var i = this.shoppingIndex + 1; i < this.shopList.length; i++) {
        if (this.shopList[i].raw.drug.generic == this.shopList[this.shoppingIndex].raw.drug.generic) {
          this.shopList[i].extra.genericIndex.relative_index[0] -= 1;
        }

        if (this.shopList[i].raw.drug.generic != this.shopList[this.shoppingIndex].raw.drug.generic || i == this.shopList.length - 1) {

          this.shopList[this.shoppingIndex + 1].extra.fullBasket = this.shopList[this.shoppingIndex].extra.fullBasket;
          this.shopList = this.arrayMove(this.shopList, this.shoppingIndex, i == this.shopList.length - 1 ? i : i - 1);

          return;
        }
      }
    };

    shopping.prototype.selectShoppingOption = function selectShoppingOption(key) {
      if (this.shopList[this.shoppingIndex].extra.outcome[key]) return;
      this.formComplete = true;

      for (var outcome_option in this.shopList[this.shoppingIndex].extra.outcome) {
        if (outcome_option !== key) {
          this.shopList[this.shoppingIndex].extra.outcome[outcome_option] = false;
        } else {
          this.shopList[this.shoppingIndex].extra.outcome[outcome_option] = true;
        }
      }

      if (key == 'missing') {
        this.setNextToNext();
      } else if (this.shoppingIndex == this.shopList.length - 1) {
        this.setNextToSave();
      }
    };

    shopping.prototype.arrayMove = function arrayMove(arr, fromIndex, toIndex) {
      var res = arr.slice(0);
      var element = res[fromIndex];
      res.splice(fromIndex, 1);
      res.splice(toIndex, 0, element);
      return res;
    };

    shopping.prototype.formatExp = function formatExp(rawStr) {
      var substr_arr = rawStr.slice(2, 7).split("-");
      return substr_arr[1] + "/" + substr_arr[0];
    };

    shopping.prototype.someOutcomeSelected = function someOutcomeSelected(outcomeObj) {
      return ~Object.values(outcomeObj).indexOf(true);
    };

    shopping.prototype.warnAboutRequired = function warnAboutRequired() {
      this.snackbar.show('Basket number and outcome are required');
    };

    shopping.prototype.setNextToLoading = function setNextToLoading() {
      this.nextButtonText = 'Updating';
    };

    shopping.prototype.setNextToSave = function setNextToSave() {
      this.nextButtonText = 'Complete';
    };

    shopping.prototype.setNextToNext = function setNextToNext() {
      this.nextButtonText = 'Next';
    };

    shopping.prototype.getOutcome = function getOutcome(extraItemData) {
      var res = '';
      for (var possibility in extraItemData.outcome) {
        if (extraItemData.outcome[possibility]) res += possibility;
      }
      return res;
    };

    return shopping;
  }()) || _class);

  var pendedFilterValueConverter = exports.pendedFilterValueConverter = function () {
    function pendedFilterValueConverter() {
      _classCallCheck(this, pendedFilterValueConverter);
    }

    pendedFilterValueConverter.prototype.toView = function toView() {
      var pended = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var term = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';


      term = term.toLowerCase();
      var matches = [];

      if (term.trim().length == 0) {
        matches = pended;
      } else {

        for (var i = 0; i < pended.length; i++) {

          if (~pended[i].name.toLowerCase().indexOf(term) || term.trim().length == 0) {
            matches.unshift(pended[i]);
            continue;
          } else if (pended[i].baskets.length > 0) {
            for (var n = 0; n < pended[i].baskets.length; n++) {
              if (~pended[i].baskets[n].toLowerCase().indexOf(term)) {
                matches.unshift(pended[i]);
                break;
              }
            }
          }
        }
      }

      return matches;
    };

    return pendedFilterValueConverter;
  }();
});
define('client/src/views/routes',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var App = exports.App = function () {
    function App() {
      _classCallCheck(this, App);
    }

    App.prototype.configureRouter = function configureRouter(config, router) {
      this.routes = router.navigation;
      config.title = 'SIRUM';
      config.map([{ route: 'login', moduleId: 'client/src/views/login', title: 'Login', nav: true }, { route: 'join', moduleId: 'client/src/views/join', title: 'Join', nav: true }, { route: 'account', moduleId: 'client/src/views/account', title: 'Account', nav: true, roles: ["user"] }, { route: 'picking', moduleId: 'client/src/views/picking', title: 'Picking', nav: true, roles: ["user"] }, { route: 'inventory', moduleId: 'client/src/views/inventory', title: 'Inventory', nav: true, roles: ["user"] }, { route: ['shipments', 'shipments/:id', ''], moduleId: 'client/src/views/shipments', title: 'Shipments', nav: true, roles: ["user"] }, { route: ['drugs', 'drugs/:id'], moduleId: 'client/src/views/drugs', title: 'Drugs', nav: true, roles: ["user"] }]);
    };

    return App;
  }();
});
define('client/src/views/shipments',['exports', 'aurelia-framework', 'aurelia-router', '../libs/pouch', 'aurelia-http-client', '../libs/csv', '../resources/helpers'], function (exports, _aureliaFramework, _aureliaRouter, _pouch, _aureliaHttpClient, _csv, _helpers) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.shipments = undefined;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var shipments = exports.shipments = (_dec = (0, _aureliaFramework.inject)(_pouch.Pouch, _aureliaRouter.Router, _aureliaHttpClient.HttpClient), _dec(_class = function () {
    function shipments(db, router, http) {
      _classCallCheck(this, shipments);

      this.csv = _csv.csv;
      this.db = db;
      this.drugs = [];
      this.router = router;
      this.http = http;
      this.stati = ['pickup', 'shipped', 'received'];
      this.shipments = {};
      this.term = '';

      this.waitForDrugsToIndex = _helpers.waitForDrugsToIndex;
      this.expShortcutsKeydown = _helpers.expShortcuts;
      this.qtyShortcutsKeydown = _helpers.qtyShortcuts;
      this.removeTransactionIfQty0 = _helpers.removeTransactionIfQty0;
      this.incrementBin = _helpers.incrementBin;
      this.saveTransaction = _helpers.saveTransaction;
      this.focusInput = _helpers.focusInput;
      this.scrollSelect = _helpers.scrollSelect;
      this.toggleDrawer = _helpers.toggleDrawer;
      this.drugSearch = _helpers.drugSearch;
      this.canActivate = _helpers.canActivate;
      this.instructionsText = 'Filter shipments';

      this.shipmentDrawerYearChoices = [new Date().getFullYear()];
      this.shipmentDrawerYear = null;
    }

    shipments.prototype.activate = function activate(params) {
      var _this = this;

      return this.db.user.session.get().then(function (session) {
        _this.user = session._id;
        return _this.db.account.get(session.account._id);
      }).then(function (account) {
        var _this$ordered;

        _this.db.user.get(_this.user).then(function (user) {
          _this.router.routes[2].navModel.setTitle(user.name.first);
        });

        _this.account = account;

        _this.ordered = (_this$ordered = {}, _this$ordered[account._id] = account.ordered, _this$ordered);

        _this.initializeDrawer();

        _this.gatherShipments(params).then(function (_) {
          return _this.setInstructionsText("", true);
        });
      }).catch(function (err) {
        console.error('Could not get session for user.  Please verify user registration and login are functioning properly');
      });
    };

    shipments.prototype.setInstructionsText = function setInstructionsText(str) {
      var reset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      this.instructionsText = reset ? "Filter shipments " + this.role.accounts + " you" : str;
    };

    shipments.prototype.selectShipment = function selectShipment(shipment, toggleDrawer) {
      if (toggleDrawer) this.toggleDrawer();

      if (!shipment) return this.emptyShipment();
      this.setUrl('/' + shipment._id);
      this.setShipment(shipment);
      this.setTransactions(shipment._id);
    };

    shipments.prototype.initializeDrawer = function initializeDrawer() {
      var _this2 = this;

      this.shipmentDrawerYear = this.shipmentDrawerYearChoices[0];
      this.db.shipment.query('account.to._id', { startkey: [this.account._id], endkey: [this.account._id + '\uFFFF'], group_level: 2 }).then(function (res) {
        var years = res.rows.map(function (row) {
          return row.key[1];
        });
        var currentYear = new Date().getFullYear().toString();
        if (!years.includes(currentYear)) years.push(currentYear);
        _this2.shipmentDrawerYearChoices = years.sort(function (a, b) {
          return b - a;
        });
      });
    };

    shipments.prototype.refocusWithNewShipments = function refocusWithNewShipments() {
      this.setInstructionsText("...Loading shipments...", false);
      this.filter = '';
      this.shipments = {};
      this.focusInput('#drawer_filter');
    };

    shipments.prototype.gatherShipments = function gatherShipments() {
      var _this3 = this;

      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};


      var senderAccounts = this.db.account.allDocs({ keys: this.account.authorized, include_docs: true });

      var shipmentsReceived = this.db.shipment.query('account.to._id', { startkey: [this.account._id, this.shipmentDrawerYear.toString() + '\uFFFF'], endkey: [this.account._id, this.shipmentDrawerYear.toString()], descending: true, reduce: false, include_docs: true });

      return Promise.all([senderAccounts, shipmentsReceived]).then(function (all) {
        senderAccounts = all[0].rows;
        shipmentsReceived = all[1].rows;

        var selected = void 0,
            map = { to: {}, from: {} };

        _this3.accounts = {
          from: [''].concat(senderAccounts.map(function (account) {
            var doc = account.doc;

            if (!doc) {
              console.error('doc property is not set', account, senderAccounts);
              return {};
            }

            _this3.ordered[doc._id] = doc.ordered;
            return map.from[doc._id] = { _id: doc._id, name: doc.name };
          }).sort(function (a, b) {
            if (a.name > b.name) return 1;
            if (a.name < b.name) return -1;
          }))
        };

        _this3.shipment = {};

        var accountRef = function accountRef(role) {
          return function (_ref) {
            var doc = _ref.doc;

            _this3.setStatus(doc);

            if (map[role][doc.account[role]._id]) doc.account[role] = map[role][doc.account[role]._id];

            if (params.id === doc._id) selected = doc;

            return doc;
          };
        };

        _this3.role = selected ? { accounts: 'to', shipments: 'from' } : { accounts: 'from', shipments: 'to' };

        _this3.shipments.to = shipmentsReceived.map(accountRef('from'));

        _this3.setInstructionsText("", true);

        _this3.selectShipment(selected);
      }).catch(function (err) {
        return console.log('promise all err', err);
      });
    };

    shipments.prototype.emptyShipment = function emptyShipment() {
      this.setUrl('');

      if (this.role.shipments == 'to') {
        this.setShipment({ account: { to: { _id: this.account._id, name: this.account.name }, from: {} } });
        this.setTransactions();
      } else {
        this.setShipment({ account: { from: { _id: this.account._id, name: this.account.name }, to: {} } });
        this.setTransactions(this.account._id);
      }
    };

    shipments.prototype.setShipment = function setShipment(shipment) {
      this.shipment = shipment;
      this.shipmentId = shipment._id;
      this.attachment = null;
    };

    shipments.prototype.setUrl = function setUrl(url) {
      this.router.navigate('shipments' + url, { trigger: false });
    };

    shipments.prototype.setTransactions = function setTransactions(shipmentId) {
      var _this4 = this;

      this.diffs = [];

      if (!shipmentId) return this.transactions = [];

      this.db.transaction.query('shipment._id', { key: [this.account._id, shipmentId], include_docs: true, descending: true }).then(function (res) {
        _this4.transactions = res.rows.map(function (row) {
          return row.doc;
        });
        _this4.setCheckboxes();
      }).catch(function (err) {
        return console.log('err', err);
      });
    };

    shipments.prototype.setCheckboxes = function setCheckboxes() {
      for (var _iterator = this.transactions, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref2;

        if (_isArray) {
          if (_i >= _iterator.length) break;
          _ref2 = _iterator[_i++];
        } else {
          _i = _iterator.next();
          if (_i.done) break;
          _ref2 = _i.value;
        }

        var transaction = _ref2;

        transaction.isChecked = this.shipmentId == this.shipment._id && transaction.verifiedAt;
      }
    };

    shipments.prototype.setStatus = function setStatus(shipment) {
      shipment.status = this.stati.reduce(function (prev, curr) {
        return shipment[curr + 'At'] ? curr : prev;
      });
    };

    shipments.prototype.swapRole = function swapRole() {
      var _ref3 = [this.role.shipments, this.role.accounts];
      this.role.accounts = _ref3[0];
      this.role.shipments = _ref3[1];

      this.selectShipment();
      return true;
    };

    shipments.prototype.saveShipment = function saveShipment() {
      var _this5 = this;

      return this.db.shipment.put(this.shipment).then(function (res) {
        _this5.setStatus(_this5.shipment);
      });
    };

    shipments.prototype.moveTransactionsToShipment = function moveTransactionsToShipment(shipment) {
      var _this6 = this;

      Promise.all(this.transactions.map(function (transaction) {
        if (transaction.isChecked) {
          transaction.shipment = { _id: shipment._id };
          return _this6.db.transaction.put(transaction);
        }
      })).then(function (_) {
        return _this6.selectShipment(shipment);
      });
    };

    shipments.prototype.createShipment = function createShipment() {
      var _this7 = this;

      if (this.shipment.tracking == 'New Tracking #') delete this.shipment.tracking;

      this.shipments[this.role.shipments].unshift(this.shipment);
      this.setStatus(this.shipment);

      this.db.shipment.post(this.shipment).then(function (res) {
        return _this7.moveTransactionsToShipment(_this7.shipment);
      }).catch(function (err) {
        return console.error('createShipment error', err, _this7.shipment);
      });
    };

    shipments.prototype.expShortcutsInput = function expShortcutsInput($index) {
      this.autoCheck($index);
    };

    shipments.prototype.qtyShortcutsInput = function qtyShortcutsInput($event, $index) {
      this.removeTransactionIfQty0($event, $index) && this.autoCheck($index);
    };

    shipments.prototype.binShortcuts = function binShortcuts($event, $index) {
      if ($event.which == 13) return this.focusInput('md-autocomplete');

      return this.incrementBin($event, this.transactions[$index]);
    };

    shipments.prototype.getBin = function getBin(transaction) {
      return (this.getOrder(transaction) || {}).defaultBin || this._bin;
    };

    shipments.prototype.setBin = function setBin(transaction) {
      if (this.getBin(transaction) != transaction.bin) this._bin = transaction.bin;
    };

    shipments.prototype.aboveMinQty = function aboveMinQty(order, transaction) {
      var qty = transaction.qty[this.role.shipments];
      if (!qty) return false;
      console.log('aboveMinQty', transaction);
      var price = transaction.drug.price.goodrx || transaction.drug.price.nadac || 0;
      var minQty = +order.minQty || this.account.default.minQty;
      var aboveMinQty = qty >= minQty;
      if (!aboveMinQty) console.log('Ordered drug but qty', qty, 'is less than', minQty);
      return aboveMinQty;
    };

    shipments.prototype.aboveMinExp = function aboveMinExp(order, transaction) {
      var exp = transaction.exp[this.role.shipments];
      var minDays = order.minDays || this.account.default.minDays;
      if (!exp) return !minDays;
      var days = (new Date(exp) - Date.now()) / 24 / 60 / 60 / 1000;
      var aboveMinExp = days >= minDays;
      if (!aboveMinExp) console.log('Ordered drug but expiration', exp, 'is in', days, 'days and is before min days of', minDays);
      return aboveMinExp;
    };

    shipments.prototype.belowMaxInventory = function belowMaxInventory(order, transaction) {
      var newInventory = transaction.qty[this.role.shipments] + order.indateInventory;
      var maxInventory = order.maxInventory || this.account.default.maxInventory;
      var belowMaxInventory = isNaN(newInventory) ? true : newInventory < maxInventory;
      if (!belowMaxInventory) console.log('Ordered drug but inventory', newInventory, 'would be above max of', maxInventory);
      return belowMaxInventory;
    };

    shipments.prototype.getOrder = function getOrder(transaction) {
      return this.ordered[this.shipment.account.to._id][transaction.drug.generic];
    };

    shipments.prototype.isWanted = function isWanted(order, transaction) {
      return order ? this.belowMaxInventory(order, transaction) && this.aboveMinQty(order, transaction) && this.aboveMinExp(order, transaction) : false;
    };

    shipments.prototype.setDestroyedMessage = function setDestroyedMessage(order) {
      var _this8 = this;

      if (order && order.destroyedMessage && !this.destroyedMessage) this.destroyedMessage = setTimeout(function (_) {
        delete _this8.destroyedMessage;
        _this8.snackbar.show(order.destroyedMessage);
      }, 500);
    };

    shipments.prototype.clearDestroyedMessage = function clearDestroyedMessage() {
      clearTimeout(this.destroyedMessage);
      delete this.destroyedMessage;
    };

    shipments.prototype.autoCheck = function autoCheck($index) {
      var transaction = this.transactions[$index];
      var isChecked = transaction.isChecked;
      var order = this.getOrder(transaction);

      if (this.isWanted(order, transaction) == isChecked) return !isChecked && transaction.qty.to > 0 && this.setDestroyedMessage(order);

      if (isChecked) this.setDestroyedMessage(order);

      if (!isChecked) {
        this.snackbar.show(order && order.verifiedMessage || 'Drug is ordered');
        this.clearDestroyedMessage();
      }

      this.manualCheck($index);
    };

    shipments.prototype.manualCheck = function manualCheck($index) {
      var transaction = this.transactions[$index];
      transaction.isChecked = !transaction.isChecked;

      this.moveItemsButton.offsetParent ? this.toggleSelectedCheck(transaction) : this.toggleVerifiedCheck(transaction);
    };

    shipments.prototype.toggleVerifiedCheck = function toggleVerifiedCheck(transaction) {

      var next = transaction.next;
      var verifiedAt = transaction.verifiedAt;

      if (verifiedAt) {
        transaction.verifiedAt = null;
        transaction.next = [{ disposed: { _id: new Date().toJSON(), user: { _id: this.user } } }];
        transaction.bin = null;
      } else {
        transaction.verifiedAt = new Date().toJSON();
        transaction.next = [];
        transaction.bin = transaction.bin || this.getBin(transaction);
      }

      this.saveTransaction(transaction).catch(function (err) {
        transaction.next = next;
        transaction.verifiedAt = verifiedAt;
      });
    };

    shipments.prototype.toggleSelectedCheck = function toggleSelectedCheck(transaction) {
      var index = this.diffs.indexOf(transaction);
      ~index ? this.diffs.splice(index, 1) : this.diffs.push(transaction);
    };

    shipments.prototype.search = function search() {
      var _this9 = this;

      this.drugSearch().then(function (drugs) {
        _this9.drugs = drugs;
        _this9.drug = drugs[0];
      });
    };

    shipments.prototype.autocompleteShortcuts = function autocompleteShortcuts($event) {
      var _this10 = this;

      this.scrollSelect($event, this.drug, this.drugs, function (drug) {
        return _this10.drug = drug;
      });

      if ($event.which == 13) {
        Promise.resolve(this._search).then(function (_) {
          return _this10.addTransaction(_this10.drug);
        });
        return false;
      }

      if ($event.which == 106 || $event.shiftKey && $event.which == 56) this.term = "";

      return true;
    };

    shipments.prototype.addTransaction = function addTransaction(drug, transaction) {
      var _this11 = this;

      if (!drug) return this.snackbar.show('Cannot find drug matching this search');

      this.drug = drug;

      if (drug.warning) this.dialog.showModal();

      transaction = transaction || {
        qty: { from: null, to: null },
        exp: {
          from: this.transactions[0] ? this.transactions[0].exp.from : null,
          to: this.transactions[0] ? this.transactions[0].exp.to : null
        },
        next: [{ disposed: { _id: new Date().toJSON(), user: { _id: this.user } } }]
      };

      transaction.drug = {
        _id: drug._id,
        brand: drug.brand,
        gsns: drug.gsns,
        generic: drug.generic,
        generics: drug.generics,
        form: drug.form,
        price: drug.price,
        pkg: drug.pkg
      };

      transaction.user = { _id: this.user };
      transaction.shipment = { _id: this.shipment._rev ? this.shipment._id : this.account._id };

      this.term = '';
      this.transactions.unshift(transaction);

      var order = this.getOrder(transaction);

      if (order) {

        var minDays = order.minDays || this.account.default && this.account.default.minDays || 30;
        var date = new Date();
        date.setDate(+minDays + date.getDate());
        date = date.toJSON().slice(0, 10).split('-');

        this.db.transaction.query('inventory-by-generic', { startkey: [this.account._id, 'month', date[0], date[1], drug.generic], endkey: [this.account._id, 'month', date[0], date[1], drug.generic, {}] }).then(function (inventory) {
          console.log('indate inventory', minDays, date, inventory);
          var row = inventory.rows[0];
          order.indateInventory = row ? row.value[0].sum : 0;
          console.log('order.inventory', _this11.indateInventory);
        });
      }

      setTimeout(function (_) {
        return _this11.focusInput('#exp_0');
      }, 50);

      return this._saveTransaction = Promise.resolve(this._saveTransaction).then(function (_) {
        return _this11.db.transaction.post(transaction).catch(function (err) {
          _this11.snackbar.error('Transaction could not be added: ', err);
          _this11.transactions.shift();
        });
      });
    };

    shipments.prototype.dialogClose = function dialogClose() {
      this.dialog.close();
      this.focusInput('#exp_0');
    };

    shipments.prototype.exportCSV = function exportCSV() {

      var shipment = JSON.parse(JSON.stringify(this.shipment));
      var name = 'Shipment ' + this.shipment._id + '.csv';

      delete shipment.account.to.authorized;
      delete shipment.account.to.ordered;
      delete shipment.account.from.authorized;
      delete shipment.account.from.ordered;

      this.csv.fromJSON(name, this.transactions.map(function (transaction) {
        return {
          '': transaction,
          'next': JSON.stringify(transaction.next || []),
          'drug._id': " " + transaction.drug._id,
          'drug.generics': transaction.drug.generics.map(function (generic) {
            return generic.name + " " + generic.strength;
          }).join(';'),
          shipment: shipment
        };
      }));
    };

    shipments.prototype.importCSV = function importCSV() {
      var _this12 = this;

      this.csv.toJSON(this.$file.files[0], function (parsed) {
        _this12.$file.value = '';
        return Promise.all(parsed.map(function (transaction) {
          transaction._err = undefined;
          transaction._id = undefined;
          transaction._rev = undefined;
          transaction.shipment._id = _this12.shipment._id;
          transaction.next = JSON.parse(transaction.next);

          return _this12.db.drug.get(transaction.drug._id).then(function (drug) {
            return _this12.addTransaction(drug, transaction);
          }).then(function (_) {
            return undefined;
          }).catch(function (err) {
            transaction._err = 'Upload Error: ' + JSON.stringify(err);
            return transaction;
          });
        }));
      }).then(function (rows) {
        return _this12.snackbar.show('Import Succesful');
      }).catch(function (err) {
        return _this12.snackbar.error('Import Error', err);
      });
    };

    return shipments;
  }()) || _class);
});
define('text!client/src/elems/md-autocomplete.html', ['module'], function(module) { module.exports = "<template style=\"box-shadow:none\">\n  <!-- z-index of 2 is > than checkboxes which have z-index of 1 -->\n  <md-autocomplete-wrap\n    ref=\"form\"\n    class=\"mdl-textfield mdl-js-textfield mdl-textfield--floating-label\"\n    style=\"z-index:2; width:100%; padding-top:10px\">\n    <input class=\"md-input mdl-textfield__input\"\n      name = \"pro_input_field\"\n      value.bind=\"value\"\n      disabled.bind=\"disabled\"\n      placeholder.bind=\"placeholder || ''\"\n      focus.trigger=\"toggleResults()\"\n      focusout.delegate=\"toggleResults($event)\"\n      style=\"font-size:20px;\">\n    <div show.bind=\"showResults\"\n      tabindex=\"-1\"\n      style=\"width:100%; overflow-y:scroll; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25); max-height: 400px !important;\"\n      class=\"md-autocomplete-suggestions\">\n      <slot></slot>\n    </div>\n  </md-autocomplete-wrap>\n  <style>\n  @-webkit-keyframes md-autocomplete-list-out {\n    0% {\n      -webkit-animation-timing-function: linear;\n              animation-timing-function: linear; }\n\n    50% {\n      opacity: 0;\n      height: 40px;\n      -webkit-animation-timing-function: ease-in;\n              animation-timing-function: ease-in; }\n\n    100% {\n      height: 0;\n      opacity: 0; } }\n\n  @keyframes md-autocomplete-list-out {\n    0% {\n      -webkit-animation-timing-function: linear;\n              animation-timing-function: linear; }\n\n    50% {\n      opacity: 0;\n      height: 40px;\n      -webkit-animation-timing-function: ease-in;\n              animation-timing-function: ease-in; }\n\n    100% {\n      height: 0;\n      opacity: 0; } }\n\n  @-webkit-keyframes md-autocomplete-list-in {\n    0% {\n      opacity: 0;\n      height: 0;\n      -webkit-animation-timing-function: ease-out;\n              animation-timing-function: ease-out; }\n\n    50% {\n      opacity: 0;\n      height: 40px; }\n\n    100% {\n      opacity: 1;\n      height: 40px; } }\n\n  @keyframes md-autocomplete-list-in {\n    0% {\n      opacity: 0;\n      height: 0;\n      -webkit-animation-timing-function: ease-out;\n              animation-timing-function: ease-out; }\n\n    50% {\n      opacity: 0;\n      height: 40px; }\n\n    100% {\n      opacity: 1;\n      height: 40px; } }\n\n  md-autocomplete {\n    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);\n    border-radius: 2px;\n    display: block;\n    height: 40px;\n    position: relative;\n    overflow: visible;\n    min-width: 190px; }\n    md-autocomplete[md-floating-label] {\n      padding-bottom: 26px;\n      box-shadow: none;\n      border-radius: 0;\n      background: transparent;\n      height: auto; }\n      md-autocomplete[md-floating-label] md-input-container {\n        padding-bottom: 0; }\n      md-autocomplete[md-floating-label] md-autocomplete-wrap {\n        height: auto; }\n      md-autocomplete[md-floating-label] button {\n        top: auto;\n        bottom: 5px; }\n    md-autocomplete md-autocomplete-wrap {\n      display: block;\n      position: relative;\n      overflow: visible;\n      height: 40px; }\n      md-autocomplete md-autocomplete-wrap md-progress-linear {\n        position: absolute;\n        bottom: 0;\n        left: 0;\n        width: 100%;\n        height: 3px;\n        transition: none; }\n        md-autocomplete md-autocomplete-wrap md-progress-linear .md-container {\n          transition: none;\n          top: auto;\n          height: 3px; }\n        md-autocomplete md-autocomplete-wrap md-progress-linear.ng-enter {\n          transition: opacity 0.15s linear; }\n          md-autocomplete md-autocomplete-wrap md-progress-linear.ng-enter.ng-enter-active {\n            opacity: 1; }\n        md-autocomplete md-autocomplete-wrap md-progress-linear.ng-leave {\n          transition: opacity 0.15s linear; }\n          md-autocomplete md-autocomplete-wrap md-progress-linear.ng-leave.ng-leave-active {\n            opacity: 0; }\n    md-autocomplete input:not(.md-input) {\n      position: absolute;\n      left: 0;\n      top: 0;\n      width: 100%;\n      box-sizing: border-box;\n      border: none;\n      box-shadow: none;\n      padding: 0 15px;\n      font-size: 14px;\n      line-height: 40px;\n      height: 40px;\n      outline: none;\n      background: transparent; }\n      md-autocomplete input:not(.md-input)::-ms-clear {\n        display: none; }\n    md-autocomplete button {\n      position: absolute;\n      top: 10px;\n      right: 10px;\n      line-height: 20px;\n      text-align: center;\n      width: 20px;\n      height: 20px;\n      cursor: pointer;\n      border: none;\n      border-radius: 50%;\n      padding: 0;\n      font-size: 12px;\n      background: transparent; }\n      md-autocomplete button:after {\n        content: '';\n        position: absolute;\n        top: -6px;\n        right: -6px;\n        bottom: -6px;\n        left: -6px;\n        border-radius: 50%;\n        -webkit-transform: scale(0);\n                transform: scale(0);\n        opacity: 0;\n        transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); }\n      md-autocomplete button:focus {\n        outline: none; }\n        md-autocomplete button:focus:after {\n          -webkit-transform: scale(1);\n                  transform: scale(1);\n          opacity: 1; }\n      md-autocomplete button md-icon {\n        position: absolute;\n        top: 50%;\n        left: 50%;\n        -webkit-transform: translate3d(-50%, -50%, 0) scale(0.9);\n                transform: translate3d(-50%, -50%, 0) scale(0.9); }\n        md-autocomplete button md-icon path {\n          stroke-width: 0; }\n      md-autocomplete button.ng-enter {\n        -webkit-transform: scale(0);\n                transform: scale(0);\n        transition: -webkit-transform 0.15s ease-out;\n        transition: transform 0.15s ease-out; }\n        md-autocomplete button.ng-enter.ng-enter-active {\n          -webkit-transform: scale(1);\n                  transform: scale(1); }\n      md-autocomplete button.ng-leave {\n        transition: -webkit-transform 0.15s ease-out;\n        transition: transform 0.15s ease-out; }\n        md-autocomplete button.ng-leave.ng-leave-active {\n          -webkit-transform: scale(0);\n                  transform: scale(0); }\n    @media screen and (-ms-high-contrast: active) {\n      md-autocomplete input {\n        border: 1px solid #fff; }\n      md-autocomplete li:focus {\n        color: #fff; } }\n\n  .md-autocomplete-suggestions table, .md-autocomplete-suggestions ul {\n    table-layout:auto;  //added by adam\n    width:100%;         //added by adam\n    background:white;   //added by adam\n    position: relative;\n    margin: 0;\n    list-style: none;\n    padding: 0;\n    z-index: 100; }\n    .md-autocomplete-suggestions li {\n      line-height: 48px; //separated by adam\n    }\n    .md-autocomplete-suggestions li, .md-autocomplete-suggestions tr {\n      /*added by adam */\n      width:100%;\n      text-align: left;\n      position: static !important;\n      text-transform: none;\n      /* end addition */\n      cursor: pointer;\n      font-size: 14px;\n      overflow: hidden;\n\n      transition: background 0.15s linear;\n      text-overflow: ellipsis; }\n      .md-autocomplete-suggestions li.ng-enter, .md-autocomplete-suggestions li.ng-hide-remove {\n        transition: none;\n        -webkit-animation: md-autocomplete-list-in 0.2s;\n                animation: md-autocomplete-list-in 0.2s; }\n      .md-autocomplete-suggestions li.ng-leave, .md-autocomplete-suggestions li.ng-hide-add {\n        transition: none;\n        -webkit-animation: md-autocomplete-list-out 0.2s;\n                animation: md-autocomplete-list-out 0.2s; }\n      .md-autocomplete-suggestions li:focus {\n        outline: none; }\n  </style>\n</template>\n"; });
define('text!client/src/elems/md-button.html', ['module'], function(module) { module.exports = "<template style=\"display:inline-block; height:36px; line-height:36px\">\n  <button\n    ref=\"button\"\n    type=\"button\"\n    disabled.two-way=\"disabled\"\n    click.delegate=\"click($event)\"\n    class=\"mdl-button mdl-js-button mdl-js-ripple-effect ${ color } ${ (raised || raised === '') && 'mdl-button--raised' } \"\n    style=\"width:100%; height:inherit; line-height:inherit\">\n    <slot style=\"padding:auto\"></slot>\n  </button>\n</template>\n<!-- type=\"button\" because a button inside a form has its type implicitly set to submit. And the spec says that the first button or input with type=\"submit\" is triggered on enter -->\n<!-- two-way because FormCustomAttribute can set button's disabled property directly -->\n"; });
define('text!client/src/elems/md-checkbox.html', ['module'], function(module) { module.exports = "<template style=\"display:inline-block\">\n  <label ref=\"label\" class=\"mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect\" style=\"width:100%; margin-right:8px\">\n    <input\n      name = \"pro_input\"\n      required.bind=\"required || required ===''\"\n      disabled.bind=\"disabled || disabled ===''\"\n      checked.bind=\"checked\"\n      tabindex.one-time=\"tabindex\"\n      type=\"checkbox\"\n      class=\"mdl-checkbox__input\"\n      click.delegate=\"stopPropogation()\"/>\n    <slot></slot>\n  </label>\n</template>\n"; });
define('text!client/src/elems/md-drawer.html', ['module'], function(module) { module.exports = "<template>\n    <slot></slot>\n</template>\n"; });
define('text!client/src/elems/md-input.html', ['module'], function(module) { module.exports = "<!-- firefox needs max-height otherwise is oversizes the parent element -->\n<template style=\"display:inline-block; box-sizing:border-box;\">\n  <div ref=\"div\" class=\"mdl-textfield mdl-js-textfield mdl-textfield--floating-label\" style=\"width:100%; margin-bottom:-12px; padding-top:22px; min-height:19px; line-height:19px; font-size:inherit; text-overflow:inherit; display:block; ${ label.textContent.trim() || 'padding-top:0px'};\">\n    <!-- Chrome's input[type=date] has a minimum height of 24px because of its internal buttons, to align heights we need to make all have min-height. -->\n    <input\n      if.bind=\"type != 'number'\"\n      type.bind=\"type\"\n      name=\"input\"\n      ref=\"input\"\n      required.bind=\"required || required === ''\"\n      class=\"mdl-textfield__input\"\n      value.bind=\"value\"\n      disabled.bind=\"disabled || disabled === ''\"\n      pattern.bind=\"pattern || '.*'\"\n      placeholder.bind=\"placeholder || ''\"\n      minlength.bind=\"minlength\"\n      maxlength.bind=\"maxlength || 100\"\n      style=\"padding:0; min-height:inherit; line-height:inherit; font-size:inherit; font-weight:inherit; text-transform:inherit; text-overflow:inherit; \"/>\n    <input\n      if.bind=\"type == 'number'\"\n      type=\"number\"\n      name=\"input\"\n      ref=\"input\"\n      required.bind=\"required || required === ''\"\n      class=\"mdl-textfield__input\"\n      value.bind=\"value\"\n      disabled.bind=\"disabled || disabled === ''\"\n      max.bind=\"max\"\n      min.bind=\"min\"\n      step.bind=\"step\"\n      placeholder.bind=\"placeholder || ''\"\n      style=\"padding:0; min-height:inherit; line-height:inherit; font-size:inherit; font-weight:inherit; text-transform:inherit; text-overflow:inherit; \"/>\n    <label ref=\"label\" style.bind=\"(type == 'date' || value || placeholder) ? '' : 'top:23px'\" class=\"mdl-textfield__label\"><slot></slot></label> <!-- top aligns placeholder height with surronding text -->\n  </div>\n</template>\n"; });
define('text!client/src/elems/md-loading.html', ['module'], function(module) { module.exports = "<!-- vertical-align top is necessary for firefox -->\n<template>\n  <div ref=\"div\" class=\"mdl-progress mdl-js-progress\"></div>\n</template>\n"; });
define('text!client/src/elems/md-menu.html', ['module'], function(module) { module.exports = "<template style=\"display:inline-block\">\n  <style>\n    .mdl-menu a { color:inherit }\n  </style>\n  <button\n    ref=\"button\"\n    id.one-time=\"id\"\n    tabindex=\"-1\"\n    class=\"mdl-button mdl-js-button mdl-button--icon\">\n    <i class=\"material-icons\">more_vert</i>\n  </button>\n  <ul click.trigger=\"click($event)\" ref=\"ul\" class=\"mdl-menu mdl-menu--bottom-right mdl-js-menu mdl-js-ripple-effect\" data-mdl-for.one-time=\"id\">\n    <div><slot></slot></div> <!-- the <div> is necessary for menu to close when click menu item. Not sure why -->\n  </ul>\n</template>\n"; });
define('text!client/src/elems/md-select.html', ['module'], function(module) { module.exports = "<!-- vertical-align top is necessary for firefox -->\n<template style=\"display:inline-block; box-sizing:border-box; vertical-align:top; margin-bottom:8px\">\n  <style>\n  @-moz-document url-prefix() {\n    select {\n       text-indent:-2px;\n    }\n  }\n  </style>\n  <div ref=\"div\" class=\"mdl-textfield mdl-js-textfield mdl-textfield--floating-label\" style=\"width:100%; ${ label.textContent.trim() ? 'padding-top:22px' : 'padding-top:0px'}; margin-bottom:-12px; min-height:22px; line-height:22px; font-size:inherit;\">\n    <!-- Chrome's input[type=date] has a minimum height of 24px because of its internal buttons, to align heights we need to make all have min-height.  Not sure why extra pixels are necessary in chrome and firefox -->\n    <select\n      class=\"mdl-textfield__input\"\n      value.bind=\"value\"\n      disabled.bind=\"disabled || disabled === ''\"\n      required.bind=\"required || required === ''\"\n      style=\"padding:0; min-height:inherit; line-height:inherit; border-radius:0; font-size:inherit; font-weight:inherit; text-transform:inherit; -webkit-appearance:none; -moz-appearance:none;\">\n      <option if.bind=\"default\" model.bind=\"default\">\n        ${ property ? default[property] : default }\n      </option>\n      <option model.bind=\"option\" repeat.for=\"option of options\">\n        ${ property ? option[property] : option }\n      </option>\n    </select>\n    <label ref=\"label\" class=\"mdl-textfield__label\" style=\"text-align:inherit;\">\n      <slot></slot>\n    </label>\n  </div>\n</template>\n"; });
define('text!client/src/elems/md-snackbar.html', ['module'], function(module) { module.exports = "<template class=\"mdl-js-snackbar mdl-snackbar\">\n  <div name = \"pro_text\" class=\"mdl-snackbar__text\"></div>\n  <button class=\"mdl-snackbar__action\" type=\"button\"></button>\n</template>\n"; });
define('text!client/src/elems/md-switch.html', ['module'], function(module) { module.exports = "<template>\n  <label ref=\"label\" class=\"mdl-switch mdl-js-switch mdl-js-ripple-effect\" for=\"switch\" style=\"width:100%\">\n    <input\n      required.bind=\"required || required ===''\"\n      disabled.bind=\"disabled || disabled ===''\"\n      checked.bind=\"checked\"\n      type=\"checkbox\"\n      class=\"mdl-switch__input\"\n      click.delegate=\"stopPropogation()\"/>\n    <span class=\"mdl-switch__label\"><slot></slot></span>\n  </label>\n</template>\n"; });
define('text!client/src/elems/md-text.html', ['module'], function(module) { module.exports = "<!-- firefox needs max-height otherwise is oversizes the parent element -->\n<template style=\"display:inline-block; box-sizing:border-box;\">\n  <div ref=\"div\" class=\"mdl-textfield mdl-js-textfield mdl-textfield--floating-label\" style=\"width:100%; margin-bottom:-12px; padding-top:22px; min-height:19px; line-height:19px; font-size:inherit; text-overflow:inherit; display:block; ${ label.textContent.trim() || 'padding-top:0px'};\">\n    <!-- Chrome's input[type=date] has a minimum height of 24px because of its internal buttons, to align heights we need to make all have min-height. -->\n    <textarea\n      required.bind=\"required || required === ''\"\n      class=\"mdl-textfield__input\"\n      value.bind=\"value\"\n      disabled.bind=\"disabled || disabled === ''\"\n      placeholder.bind=\"placeholder || ''\"\n      style=\"padding:0; min-height:inherit; line-height:inherit; font-size:inherit; font-weight:inherit; text-transform:inherit; text-overflow:inherit; \"/>\n    </textarea>\n    <label ref=\"label\" class=\"mdl-textfield__label\"><slot></slot></label>\n  </div>\n</template>\n"; });
define('text!client/src/views/account.html', ['module'], function(module) { module.exports = "<template>\n  <require from='client/src/elems/md-shadow'></require>\n  <require from='client/src/elems/md-drawer'></require>\n  <require from='client/src/elems/md-table'></require>\n  <require from=\"client/src/elems/md-input\"></require>\n  <require from=\"client/src/elems/md-select\"></require>\n  <require from=\"client/src/elems/md-button\"></require>\n  <require from=\"client/src/elems/md-switch\"></require>\n  <require from=\"client/src/elems/md-checkbox\"></require>\n  <require from=\"client/src/elems/md-snackbar\"></require>\n  <require from=\"client/src/elems/md-menu\"></require>\n  <require from=\"client/src/elems/form\"></require>\n\n  <md-drawer>\n    <md-input value.bind=\"filter\" style=\"padding:0 8px\">Filter Users</md-input>\n    <a\n      if.bind=\" ! filter\"\n      class=\"mdl-navigation__link ${ ! user.email ? 'mdl-navigation__link--current' : ''}\"\n      click.delegate=\"selectUser({name:{}, account:{_id:session.account._id}})\">\n      <div name = \"pro_new_user\" class=\"mdl-typography--title\">New User</div>\n    </a>\n    <a\n      name = \"existing_users\"\n      repeat.for=\"user of users | userFilter:filter\"\n      class=\"mdl-navigation__link ${ user.phone == $parent.user.phone ? 'mdl-navigation__link--current' : ''}\"\n      click.delegate=\"selectUser(user)\">\n      <div class=\"mdl-typography--title\">${ user.name.first+' '+user.name.last}</div>\n    </a>\n  </md-drawer>\n\n  <section class=\"mdl-grid\">\n\n    <dialog ref=\"dialog\" class=\"mdl-dialog\" style=\"width:800px; top:3%; height:35%;\">\n      <section class=\"mdl-grid\" style=\"margin-top:10vh;\">\n        <form class=\"mdl-card mdl-cell mdl-cell--6-col mdl-cell--middle\" style=\"width:100%; margin:-75px auto 0; padding:48px 96px 28px 96px; max-width:450px\">\n          <md-input name = \"pro_phone\" value.bind=\"phone\" type=\"tel\" pattern=\"^\\d{3}[.-]?\\d{3}[.-]?\\d{4}$\" required>Phone</md-input>\n          <md-input name = \"pro_password\" value.bind=\"password\" type=\"password\" required minlength=\"4\">Password</md-input>\n          <md-button\n            name = \"pro_switch_button\"\n            raised color form\n            if.bind=\"users.length == 0 || user._id == session._id\"\n            click.delegate=\"switchUsers($event)\"\n            style=\"padding-top:16px; width:100%\">\n            ${switchUserText}\n          </md-button>\n        </form>\n      </section>\n      <div class=\"mdl-dialog__actions\">\n        <md-button click.delegate=\"closeSwitchUsersDialog()\">Close</md-button>\n      </div>\n    </dialog>\n\n    <form md-shadow=\"2\" class=\"mdl-card mdl-cell mdl-cell--4-col full-height\">\n      <div class=\"mdl-card__title\">\n        <div class=\"mdl-card__title-text\">\n          User Information\n        </div>\n      </div>\n      <div class=\"mdl-card__supporting-text\" style=\"font-size:16px;\" input.delegate=\"saveUser() & debounce:1000\">\n        <md-input style=\"width:49%\" value.bind=\"user.name.first\" name = \"pro_first_name\" required>First Name</md-input>\n        <md-input style=\"width:49%\" value.bind=\"user.name.last\" name = \"pro_last_name\" required>Last Name</md-input>\n        <md-input style=\"width:100%\" value.bind=\"user.email\" type=\"email\" name = \"pro_email\" pattern=\"[\\w._]{2,}@\\w{3,}\\.(com|org|net|gov)\" required>Email</md-input>\n        <md-input style=\"width:100%\" value.bind=\"user.phone\" type=\"tel\" name = \"pro_phone\" pattern=\"^\\d{3}[.-]?\\d{3}[.-]?\\d{4}$\" required>Phone</md-input>\n        <md-input style=\"width:100%\" value.bind=\"user.password\" name = \"pro_password\" if.bind=\" ! user._rev\" required>Password ${user._rev}</md-input>\n      </div>\n      <div class=\"mdl-card__actions\">\n        <md-button color raised style=\"width:100%\" name = \"pro_create_user_button\" if.bind=\"users.length != 0 && ! user._rev\" form disabled click.delegate=\"addUser()\">Create User</md-button>\n        <md-button color raised name = \"pro_switch_user_button\" if.bind=\"users.length == 0 || user._id == session._id\" style=\"width:100%; padding-bottom:10px\" click.delegate=\"showUserSwitchPage()\">Switch Users</md-button>\n        <md-button color=\"accent\" name = \"pro_uninstall_button\" raised style=\"width:100%\" if.bind=\"users.length == 0 || user._id == session._id\" click.delegate=\"logout()\" disabled.bind=\"disableLogout\">${ disableLogout || 'Uninstall' }</md-button>\n        <md-button color=\"accent\" name = \"pro_delete_user_button\" raised style=\"width:100%\" if.bind=\"user._rev && user._id != session._id\" click.delegate=\"deleteUser()\">Delete User</md-button>\n      </div>\n    </form>\n    <div md-shadow=\"2\" class=\"mdl-card mdl-cell mdl-cell--8-col full-height\">\n      <md-menu name=\"pro_menu\" style=\"position:absolute; z-index:2; top:10px; right:5px;\">\n        <!-- workaround for boolean attributes https://github.com/aurelia/templating/issues/76 -->\n        <li style=\"width:200px\" disabled.bind=\"true\">\n          Export\n          <div style=\"width:80px; float:right;\">Import</div>\n        </li>\n        <a download=\"Transactions ${csvDate}\" href=\"${csvHref}/transaction.csv\"><li>\n          Transactions\n          <input change.delegate=\"importCSV($event)\" type=\"file\" style=\"width:80px; float:right; margin-top:15px\">\n        </li></a>\n        <a download=\"Shipments ${csvDate}\" href=\"${csvHref}/shipment.csv\"><li>\n          Shipments\n          <input change.delegate=\"importCSV($event)\" type=\"file\" style=\"width:80px; float:right; margin-top:15px\">\n        </li></a>\n        <a download=\"Accounts ${csvDate}\" href=\"${csvHref}/account.csv\"><li>\n          Accounts\n          <input change.delegate=\"importCSV($event)\" type=\"file\" style=\"width:80px; float:right; margin-top:15px\">\n        </li></a>\n        <a download=\"Users ${csvDate}\" href=\"${csvHref}/user.csv\"><li>\n          Users\n          <input change.delegate=\"importCSV($event)\" type=\"file\" style=\"width:80px; float:right; margin-top:15px\">\n        </li></a>\n        <a download=\"Drugs ${csvDate}\" href=\"${csvHref}/drug.csv\"><li>\n          Drugs\n          <input change.delegate=\"importCSV($event)\" type=\"file\" style=\"width:80px; float:right; margin-top:15px\">\n        </li></a>\n      </md-menu>\n      <div class=\"table-wrap\">\n        <table md-table>\n          <thead>\n            <tr>\n              <th style=\"width:75px\" class=\"mdl-data-table__cell--non-numeric\">Authorized</th>\n              <th style=\"overflow:hidden\" class=\"mdl-data-table__cell--non-numeric\">\n                <md-select\n                  value.bind=\"type\"\n                  options.bind=\"['From', 'To']\"\n                  style=\"width:50px; font-weight:bold; margin-bottom:-26px\">\n                </md-select>\n              </th>\n              <th style=\"width:120px\" class=\"mdl-data-table__cell--non-numeric\">License</th>\n              <th style=\"width:60px\" class=\"mdl-data-table__cell--non-numeric\">Joined</th>\n              <th style=\"width:170px\" class=\"mdl-data-table__cell--non-numeric\">Location</th>\n            </tr>\n          </thead>\n          <tr name = \"pro_account\" repeat.for=\"account of accounts\" if.bind=\"account != $parent.account\">\n            <td class=\"mdl-data-table__cell--non-numeric\">\n              <md-checkbox\n                name = \"pro_checkbox\"\n                if.bind=\"type != 'To'\"\n                checked.one-way=\"$parent.account.authorized.indexOf(account._id) != -1\"\n                click.delegate=\"authorize(account._id)\">\n              </md-checkbox>\n              <md-checkbox\n                if.bind=\"type == 'To'\"\n                checked.one-way=\"account.authorized.indexOf($parent.account._id) != -1\"\n                disabled.bind=\"true\">\n              </md-checkbox>\n            </td>\n            <td class=\"mdl-data-table__cell--non-numeric\">${ account.name }</td>\n            <td class=\"mdl-data-table__cell--non-numeric\">${ account.license }</td>\n            <td class=\"mdl-data-table__cell--non-numeric\">${ account.createdAt | date }</td>\n            <td class=\"mdl-data-table__cell--non-numeric\">${ account.city+', '+account.state }</td>\n          </tr>\n        </table>\n      </div>\n    </div>\n\n  </section>\n  <md-snackbar ref=\"snackbar\"></md-snackbar>\n</template>\n"; });
define('text!client/src/views/drugs.html', ['module'], function(module) { module.exports = "<template>\n  <require from='client/src/elems/md-table'></require>\n  <require from='client/src/elems/md-shadow'></require>\n  <require from='client/src/elems/md-drawer'></require>\n  <require from=\"client/src/elems/md-input\"></require>\n  <require from=\"client/src/elems/md-select\"></require>\n  <require from=\"client/src/elems/md-button\"></require>\n  <require from=\"client/src/elems/md-menu\"></require>\n  <require from=\"client/src/elems/md-switch\"></require>\n  <require from=\"client/src/elems/md-autocomplete\"></require>\n  <require from=\"client/src/elems/md-snackbar\"></require>\n  <require from=\"client/src/elems/md-text\"></require>\n  <require from=\"client/src/elems/form\"></require>\n  <md-drawer>\n    <md-select\n      options.bind=\"['Ordered', 'Inventory < ReorderAt', 'Inventory > ReorderTo', 'Inventory Expiring before Min Days', 'Missing Retail Price', 'Missing Wholesale Price', 'Missing Image']\"\n      style=\"padding:0 8px;\"\n      disabled.bind=\"true\">\n      Quick Search\n    </md-select>\n    <a\n      repeat.for=\"ordered of drawer.ordered\"\n      style=\"font-size:12px; line-height:18px; padding:8px 8px\"\n      class=\"mdl-navigation__link ${ ordered == group.generic ? 'mdl-navigation__link--current' : ''}\"\n      click.delegate=\"selectDrawer(ordered)\">\n      ${ ordered }\n    </a>\n  </md-drawer>\n  <section class=\"mdl-grid au-animate\">\n    <form md-shadow=\"2\" class=\"mdl-card mdl-cell mdl-cell--4-col full-height\">\n      <div class=\"mdl-card__supporting-text\" style=\"font-size:16px;\">\n        <div repeat.for=\"generic of drug.generics\">\n          <!--\n          [1-9]{0,2} is for Vitamins which do not have 0 or 10 and can be up to two digits\n          -->\n          <md-input\n            required.bind=\" ! $last\"\n            name = \"pro_gen_field\"\n            style=\"width:75%\"\n            pattern=\"([A-Z][0-9]{0,2}[a-z]*\\s?)+\\b\"\n            value.bind=\"generic.name\"\n            input.delegate=\"setGenericRows(generic, $index, $last) & debounce:500\">\n            ${ $first ? 'Generic Names & Strengths' : ''}\n          </md-input>\n          <!--\n          limit units:\n          https://stackoverflow.com/questions/2078915/a-regular-expression-to-exclude-a-word-string\n          ([0-9]+|[0-9]+\\.[0-9]+) Numerator must start with an integer or a decimal with leading digit, e.g, 0.3 not .3\n          (?!ug|gm|meq|hr)[a-z]* Numerator may have units but must substitute the following ug > mcg, gm > g, meq > ~ mg, hr > h\n          (/....)? Denominator is optional\n          ([0-9]+|[0-9]+\\.[0-9]+)? Numerator may start with an integer or a decimal with leading digit.  Unlike numerator, optional because 1 is implied e.g. 1mg/ml or 24mg/h\n          (?!ug|gm|meq|hr)[a-z]*  Numerator may have units but must substitute (see above)\n          -->\n          <md-input\n            style=\"width:23%\"\n            pattern=\"([0-9]+|[0-9]+\\.[0-9]+)(?!ug|gm|meq|hr)[a-z]*(/([0-9]+|[0-9]+\\.[0-9]+)?(?!ug|gm|meq|hr)[a-z]*)?\"\n            value.bind=\"generic.strength\"\n            input.delegate=\"setGenericRows(generic, $index, $last) & debounce:500\">\n          </md-input>\n        </div>\n        <md-input\n          required\n          name = \"pro_form_field\"\n          style=\"width:49%\"\n          pattern=\"([A-Z][a-z]+\\s?)+\\b\"\n          value.bind=\"drug.form\">\n          Form\n        </md-input>\n        <md-input\n          style=\"width:49%\"\n          pattern=\"([A-Z][a-z]*\\s?){1,2}\\b\"\n          value.bind=\"drug.brand\">\n          Brand Name\n        </md-input>\n        <md-input\n          style=\"width:100%\"\n          value.bind=\"drug.gsns\"\n          pattern=\"\\d{1,5}(,\\d{1,5})*\">\n          GSNs\n        </md-input>\n        <md-input\n          required\n          name = \"pro_ndc_field\"\n          style=\"width:49%\"\n          value.bind=\"drug._id\"\n          disabled.bind=\"drug._rev\"\n          pattern=\"\\d{4}-\\d{4}|\\d{5}-\\d{3}|\\d{5}-\\d{4}|\\d{5}-\\d{5}\">\n          Product NDC\n        </md-input>\n        <md-input\n          style=\"width:49%\"\n          value.one-way=\"drug.ndc9 ? drug.ndc9 : ''\"\n          disabled=\"true\">\n          NDC9\n        </md-input>\n        <md-input\n          style=\"width:49%\"\n          value.bind=\"drug.labeler\">\n          Labeler\n        </md-input>\n        <md-input\n          type=\"date\"\n          style=\"width:49%\"\n          value.bind=\"drug.price.invalidAt\">\n          Prices Invalid After\n        </md-input>\n        <md-input\n          value.bind=\"drug.price.goodrx | number\"\n          type=\"number\"\n          step=\".0001\"\n          style=\"width:32%\">\n          GoodRx Price\n        </md-input>\n        <md-input\n          value.bind=\"drug.price.nadac | number\"\n          type=\"number\"\n          step=\".0001\"\n          style=\"width:32%\">\n          Nadac Price\n        </md-input>\n        <md-input\n          value.bind=\"drug.price.retail | number\"\n          type=\"number\"\n          step=\".0001\"\n          style=\"width:32%\">\n          Retail Price\n        </md-input>\n        <md-text\n          style=\"width:100%; font-size:11px\"\n          value.bind=\"drug.warning\">\n          Warning\n        </md-text>\n        <md-input\n          pattern=\"//[a-zA-Z0-9/.\\-_%]+\"\n          value.bind=\"drug.image\"\n          style=\"width:100%; font-size:9px\">\n          ${ drug.image ? 'Image' : 'Image URL'}\n        </md-input>\n        <img\n          style=\"width:100%;\"\n          if.bind=\"drug.image\"\n          src.bind=\"drug.image\">\n      </div>\n      <div class=\"mdl-card__actions\">\n        <!-- <md-button color=\"accent\" raised\n          if.bind=\"drug._rev\"\n          style=\"width:100%;\"\n          disabled\n          click.delegate=\"deleteDrug()\">\n          Delete Drug\n        </md-button> -->\n        <md-button color raised\n          form = \"onchange\"\n          name = \"pro_drug_button\"\n          style=\"width:100%;\"\n          disabled.bind=\"_savingDrug\"\n          click.delegate=\"drug._rev ? saveDrug() : addDrug()\"\n          form>\n          ${ _savingDrug ? 'Saving Drug...' : (drug._rev ? 'Save Drug' : 'Add Drug') }\n        </md-button>\n      </div>\n    </form>\n    <div md-shadow=\"2\" class=\"mdl-card mdl-cell mdl-cell--8-col full-height\">\n      <md-autocomplete\n        name = \"pro_searchbar\"\n        placeholder=\"Search Drugs by Generic Name or NDC...\"\n        value.bind=\"term\"\n        input.delegate=\"search() & debounce:50\"\n        keydown.delegate=\"scrollGroups($event) & debounce:50\"\n        style=\"margin:0px 24px; padding-right:15px\">\n        <table md-table>\n          <tr\n            name = \"pro_search_res\"\n            repeat.for=\"group of groups\"\n            click.delegate=\"selectGroup(group, true)\"\n            class=\"${ group.generic == $parent.group.generic && 'is-selected'}\">\n            <td\n              style=\"min-width:70%\"\n              class=\"mdl-data-table__cell--non-numeric\"\n              innerHTML.bind=\"group.name | bold:term\">\n            </td>\n            <td style=\"max-width:30%\">\n              ${ account.ordered[group.generic] ? 'Price:$'+(account.ordered[group.generic].price30 ? account.ordered[group.generic].price30+'/30' : (account.ordered[group.generic].price90 || account.default.price90)+'/90')+' days, Min Qty:'+(account.ordered[group.generic].minQty || account.default.minQty) +', Min Days:'+(ordered[group.generic].minDays ||  account.default.minDays) : ''}\n            </td>\n          </tr>\n        </table>\n      </md-autocomplete>\n      <md-menu name = \"pro_menu\" style=\"position:absolute; z-index:2; top:10px; right:5px;\">\n        <!-- workaround for boolean attributes https://github.com/aurelia/templating/issues/76 -->\n        <li name = \"menu_add_drug\" if.bind=\"drug._rev\" click.delegate=\"selectDrug()\" class=\"mdl-menu__item\">\n          Add Drug\n        </li>\n        <li name = \"menu_add_drug\" if.bind=\" ! drug._rev\" disabled class=\"mdl-menu__item\">\n          Add Drug\n        </li>\n        <li click.delegate=\"showDefaultsDialog()\" class=\"mdl-menu__item\">\n          Defaults\n        </li>\n        <li click.delegate=\"exportCSV()\" class=\"mdl-menu__item\">\n          Export CSV\n        </li>\n        <li click.delegate=\"$file.click()\" class=\"mdl-menu__item\">\n          Import CSV\n        </li>\n        <li>\n          USP800\n          <md-switch\n          name = \"hazard_switch\"\n          checked.one-way=\"account.hazards[group.generic]\"\n          disabled.bind=\"! account.hazards[group.generic] && ! drug._rev\"\n          click.delegate=\"markHazard()\">\n          </md-switch>\n        </li>\n      </md-menu>\n      <input ref=\"$file\" change.delegate=\"importCSV()\" style=\"display:none\" type=\"file\" />\n      <md-switch\n        name = \"pro_switch\"\n        style=\"position:absolute; right:25px; top:47px; z-index:2\"\n        checked.one-way=\"account.ordered[group.generic]\"\n        disabled.bind=\"! account.ordered[group.generic] && ! drug._rev\"\n        click.delegate=\"order()\">\n      </md-switch>\n      <div class=\"table-wrap\">\n        <table md-table style=\"width:calc(100% - 216px)\">\n          <thead>\n            <tr>\n              <th class=\"mdl-data-table__cell--non-numeric\">Ndc</th>\n              <th class=\"mdl-data-table__cell--non-numeric\">Form</th>\n              <th class=\"mdl-data-table__cell--non-numeric\">Labeler</th>\n              <th style=\"text-align:left; width:55px; padding-left:0;\">GoodRx</th>\n              <th style=\"text-align:left; width:55px; padding-left:0;\">Nadac</th>\n              <th style=\"text-align:left; width:${ account.ordered[group.generic] ? '40px' : '85px'}; padding-left:0;\">Retail</th>\n            </tr>\n          </thead>\n          <tr repeat.for=\"drug of group.drugs\" click.delegate=\"selectDrug(drug)\" class=\"${ drug._id == $parent.drug._id ? 'is-selected' : ''}\">\n            <td class=\"mdl-data-table__cell--non-numeric\">${ drug._id }</td>\n            <td class=\"mdl-data-table__cell--non-numeric\">${ drug.form }</td>\n            <td style=\"overflow:hidden\" class=\"mdl-data-table__cell--non-numeric\">${ drug.labeler }</td>\n            <td style=\"padding:0; text-align:left\">${ drug.price.goodrx | number:2 }</td>\n            <td style=\"padding:0; text-align:left\">${ drug.price.nadac | number:2 }</td>\n            <td style=\"padding:0; text-align:left\">${ drug.price.retail | number:2 }</td>\n          </tr>\n        </table>\n        <div show.bind=\"account.ordered[group.generic]\" input.delegate=\"saveAccount() & debounce:1000\" style=\"background:white; z-index:1; width:200px; margin:10px 8px;\">\n          <div style=\"width:100%\">Ordered</div>\n          <md-input\n            disabled\n            type=\"number\"\n            style=\"width:49%\"\n            value.bind=\"indateInventory\">\n            Qty > ${ (account.ordered[group.generic] || {}).minDays || account.default.minDays } Days\n          </md-input>\n          <md-input\n            disabled\n            type=\"number\"\n            style=\"width:48%\"\n            value.bind=\"outdateInventory\">\n            < ${ (account.ordered[group.generic] || {}).minDays || account.default.minDays } Days\n          </md-input>\n          <md-input\n            type=\"number\"\n            step=\"1\"\n            placeholder=\"${ (account.ordered[group.generic] || {}).price90 ? '' : account.default.price30}\"\n            value.bind=\"(account.ordered[group.generic] || {}).price30\"\n            style=\"width:49%\">\n            Price 30 Day\n          </md-input>\n          <md-input\n            type=\"number\"\n            step=\"1\"\n            placeholder=\"${ (account.ordered[group.generic] || {}).price30 ? '' : account.default.price90}\"\n            value.bind=\"(account.ordered[group.generic] || {}).price90\"\n            style=\"width:48%\">\n            90 Day\n          </md-input>\n          <md-input\n            type=\"number\"\n            value.bind=\"(account.ordered[group.generic] || {}).minDays\"\n            placeholder=\"${account.default.minDays}\"\n            style=\"width:49%\">\n            Min Days\n          </md-input>\n          <md-input\n            type=\"number\"\n            value.bind=\"(account.ordered[group.generic] || {}).minQty\"\n            placeholder=\"${account.default.minQty}\"\n            style=\"width:48%\">\n            Min Qty\n          </md-input>\n          <md-input\n            type=\"number\"\n            value.bind=\"(account.ordered[group.generic] || {}).maxInventory\"\n            placeholder=\"${account.default.maxInventory}\"\n            style=\"width:100%\">\n            Max Qty > ${ (account.ordered[group.generic] || {}).minDays || account.default.minDays } Days\n          </md-input>\n          <md-input\n            type=\"number\"\n            placeholder=\"${account.default.repackQty}\"\n            value.bind=\"(account.ordered[group.generic] || {}).repackQty\"\n            style=\"width:100%\">\n            Repack Qty\n          </md-input>\n          <md-input\n            value.bind=\"(account.ordered[group.generic] || {}).displayMessage\"\n            style=\"width:100%; font-size:12px\">\n            Display Message\n          </md-input>\n          <md-input\n            value.bind=\"(account.ordered[group.generic] || {}).destroyedMessage\"\n            style=\"width:100%; font-size:12px\">\n            Destroyed Message\n          </md-input>\n          <md-input\n            value.bind=\"(account.ordered[group.generic] || {}).verifiedMessage\"\n            style=\"width:100%; font-size:12px\">\n            Verified Message\n          </md-input>\n        </div>\n      </div>\n    </div>\n    <md-snackbar ref=\"snackbar\"></md-snackbar>\n    <dialog ref=\"dialog\" class=\"mdl-dialog\" style=\"width:800px; top:3%; height:90%; overflow-y:scroll\">\n    <h4 class=\"mdl-dialog__title\" style=\"margin-top:0px\">Order Defaults</h4>\n    <div class=\"mdl-dialog__content\" input.delegate=\"saveAccount() & debounce:1000\">\n      <md-input\n        type=\"number\"\n        value.bind=\"account.default.maxInventory\"\n        style=\"width:100%\">\n        Default Max Inventory\n      </md-input>\n      <md-input\n        type=\"number\"\n        value.bind=\"account.default.minQty\"\n        style=\"width:100%\">\n        Default Min Qty\n      </md-input>\n      <md-input\n        type=\"number\"\n        value.bind=\"account.default.minDays\"\n        style=\"width:100%\">\n        Default Min Days\n      </md-input>\n      <md-input\n        type=\"number\"\n        value.bind=\"account.default.repackQty\"\n        style=\"width:100%\">\n        Default Repack Qty\n      </md-input>\n      <md-input\n        type=\"number\"\n        step=\"1\"\n        value.bind=\"account.default.price30\"\n        style=\"width:100%\">\n        Default Price 30\n      </md-input>\n      <md-input\n        type=\"number\"\n        step=\"1\"\n        value.bind=\"account.default.price90\"\n        style=\"width:100%\">\n        Default Price 90\n      </md-input>\n    </div>\n    <div class=\"mdl-dialog__actions\">\n      <md-button click.delegate=\"closeDefaultsDialog()\">Close</md-button>\n    </div>\n  </dialog>\n  </section>\n</template>\n"; });
define('text!client/src/views/index.html', ['module'], function(module) { module.exports = "<!doctype html>\n<html style=\"overflow:hidden\">\n  <head>\n    <title>Loading SIRUM...</title>\n    <script src=\"client/assets/material.1.1.3.js\"></script>\n    <link rel=\"stylesheet\" href=\"client/assets/material.icon.css\">\n    <link rel=\"stylesheet\" href=\"client/assets/material.1.1.3.css\" />\n    <link rel=\"icon\" type=\"image/x-icon\" href=\"client/assets/favicon.png\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n    <meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n    <style>\n    body { background:#eee }\n    a { color:rgb(0,88,123); text-decoration:none }\n\n    input[type=date]::-webkit-inner-spin-button, /* increment \"spinners\" */\n    input[type=date]::-webkit-clear-button { display: none; } /* clear \"x\" button\" */\n\n    /*table-wrap needed because overflow:scroll doesn't work directly on table.  Also it is a conveneint place to do display:flex */\n    .table-wrap { overflow-y:scroll; height:100%; display:flex}\n    /*use flex instead of height:100% because latter was causing the parent md-card to have a scroll bar */\n    [md-table]  { width:100%; flex:1; table-layout:fixed; }\n    /* want hover shadow to be 100% of width, so need to do padding within the tr (which needs this hack) rather than in table-wrap */\n    [md-table] th:first-child { padding-left:24px !important}\n    [md-table] td:first-child { padding-left:24px !important}\n    [md-table] td:last-child  { padding-right:24px !important}\n\n    [md-table] tr .show-on-hover { display:none }\n    [md-table] tr:hover .show-on-hover { display:inline-block }\n\n    /*give spacing for the header and the top and bottom gullies */\n    .full-height { height:calc(100vh - 96px); overflow-y:auto}\n\n    .mdl-layout__header { background:white;}\n    .mdl-layout__header, .mdl-layout__drawer, .mdl-layout__header-row .mdl-navigation__link, .mdl-layout__header .mdl-layout__drawer-button { color:rgb(66,66,66);}\n\n    .mdl-layout__drawer .mdl-navigation .mdl-navigation__link { padding:16px;}\n    .mdl-layout__drawer .mdl-navigation .mdl-navigation__link--current { border-left:solid 3px red; padding-left:13px; background:#e0e0e0; color:inherit }\n\n    .mdl-layout__header-row .mdl-navigation__link { border-top:solid 3px white; }\n    .mdl-layout__header-row .mdl-navigation__link--current { font-weight:600;  border-top-color:red;}\n\n    .mdl-data-table th { height:auto; padding-top:7px; padding-bottom:0; }\n    .mdl-data-table tbody tr { height:auto }\n    .mdl-data-table td { border:none; padding-top:7px; padding-bottom:7px; height:auto }\n\n    .mdl-button--raised { box-shadow:none } /*otherwise disabled.bind has weird animaiton twitching */\n    .mdl-button--fab.mdl-button--colored{ background:rgb(0,88,123);}\n\n    .mdl-card__supporting-text { width:100%; box-sizing: border-box; overflow-y:auto; flex:1 }\n    .mdl-card__actions { padding:16px }\n    /* animate page transitions */\n    .au-enter-active { animation:slideDown .5s; }\n\n    .mdl-snackbar { left:auto; right:6px; bottom:6px; margin-right:0%; font-size:24px; font-weight:300; max-width:100% }\n    .mdl-snackbar--active { transform:translate(0, 0); -webkit-transform:translate(0, 0); }\n    .mdl-snackbar__text { padding:8px 24px; }\n\n    .mdl-checkbox__tick-outline { width:13px } /*widen by 1px to avoid pixel gap for checkboxes on small screens*/\n    .mdl-textfield__input { font-family:inherit } /* so that we can make Bins have a better font for differentiating 0/O and I/l*/\n    @keyframes slideDown {\n      0% {\n        opacity:0;\n        -webkit-transform:translate3d(0, -100%, 0);\n        -ms-transform:translate3d(0, -100%, 0);\n        transform:translate3d(0, -100%, 0)\n      }\n      100% {\n        opacity:.9;\n        -webkit-transform:none;\n        -ms-transform:none;\n        transform:none\n      }\n    }\n\n    /*.au-leave-active {\n      position:absolute;\n      -webkit-animation:slideLeft .5s;\n      animation:slideLeft .5s;\n    }*/\n    </style>\n    <style media=\"print\">\n      .mdl-data-table td { padding-top:4px; padding-bottom:4px; }\n      .hide-when-printed { display:none; }\n\n      /* Start multi-page printing */\n      .table-wrap { overflow-y:visible}\n      .mdl-card { overflow:visible; }\n      .mdl-layout__container { position:static}\n      .full-height { height:100%; overflow-y:visible}\n      /* End multi-page printing */\n\n    </style>\n  </head>\n  <body aurelia-app=\"client/src/views/index\">\n    <div class=\"splash\">\n      <div class=\"message\">Loading SIRUM...</div>\n      <i class=\"fa fa-spinner fa-spin\"></i>\n    </div>\n    <script src=\"pouch/pouchdb-6.1.2.js\"></script>\n    <script src=\"pouch/pouchdb-schema.js\"></script>\n    <script src=\"pouch/pouchdb-model.js\"></script>\n    <script src=\"pouch/pouchdb-client.js\"></script>\n    <script src=\"csv/papa.min.js\"></script>\n    <script src=\"csv/index.js\"></script>\n    <script src=\"client/assets/aurelia.js\" data-main=\"aurelia-bootstrapper\"></script>\n  </body>\n</html>\n"; });
define('text!client/src/views/inventory.html', ['module'], function(module) { module.exports = "<template>\n  <require from='client/src/elems/md-shadow'></require>\n  <require from='client/src/elems/md-drawer'></require>\n  <require from='client/src/elems/md-table'></require>\n  <require from=\"client/src/elems/md-input\"></require>\n  <require from=\"client/src/elems/md-select\"></require>\n  <require from=\"client/src/elems/md-button\"></require>\n  <require from=\"client/src/elems/md-switch\"></require>\n  <require from=\"client/src/elems/md-snackbar\"></require>\n  <require from=\"client/src/elems/md-checkbox\"></require>\n  <require from=\"client/src/elems/md-autocomplete\"></require>\n  <require from=\"client/src/elems/md-menu\"></require>\n  <require from=\"client/src/elems/form\"></require>\n  <style>\n    .mdl-button:hover { background-color:initial }\n    .mdl-badge[data-badge]:after { font-size:9px; height:14px; width:14px; top:1px}\n    .mdl-layout__drawer { width:280px; transform:translateX(-290px); overflow-x:hidden; }\n  </style>\n  <md-drawer>\n    <md-input\n      autoselect\n      value.bind=\"pendedFilter\"\n      style=\"padding:0 8px; width:auto\">\n      Filter pended inventory\n    </md-input>\n    <div repeat.for=\"pend of pended | pendedFilter:pendedFilter\">\n\n      <div style=\"display:inline-block; width:100%\">\n        <div\n          click.delegate=\"clickOnGroupInDrawer($event,pend.key)\"\n          class=\"mdl-typography--title ${ term == 'Pended '+pend.key ? 'mdl-navigation__link--current' : ''}\"\n          style=\"font-size:14px; float:left;font-weight:600; cursor:pointer; color:#757575; padding:8px;\">\n          ${pend.key}\n        </div>\n        <md-switch\n          name = \"groupPrioritySwitch\"\n          style=\"float:right; margin-right:12px\"\n          checked.one-way=\"shoppingSyncPended[pend.key].priority\"\n          disabled.bind = \"shoppingSyncPended[pend.key].locked\"\n          click.trigger=\"clickOnGroupInDrawer($event,pend.key)\">\n        </md-switch>\n      </div>\n\n      <div style=\"display:inline-block; width:100%\"\n        repeat.for=\"pendedDrug of pend.val | toArray\">\n        <div\n          name=\"pro_pended_items\"\n          class=\"mdl-navigation__link ${ term == 'Pended '+pend.key+': '+pendedDrug.val.label ? 'mdl-navigation__link--current' : ''}\"\n          click.delegate=\"clickOnTransactionInDrawer(false,$event,pend.key,pendedDrug.val.label)\"\n          style=\"font-size:12px; display:inline-block; width:100%; cursor:pointer; padding:1px 0 1px 8px; line-height:18px\">\n          <md-checkbox\n            if.bind = \"shoppingSyncPended[pend.key][pendedDrug.val.label].basketInfo.notFound\"\n            name = \"transactionDrawerCheckbox\"\n            style=\"display:inline-block\"\n            disabled.bind = \"shoppingSyncPended[pend.key][pendedDrug.val.label].locked\"\n            click.trigger = \"clickOnTransactionInDrawer(true,$event,pend.key,pendedDrug.val.label)\"\n            checked.bind = \"shoppingSyncPended[pend.key][pendedDrug.val.label].drawerCheck\" >\n          </md-checkbox>\n          <div\n          style=\"display:inline-block; padding-right:10px\" if.bind = \"shoppingSyncPended[pend.key][pendedDrug.val.label].basketInfo.found\"><b>${shoppingSyncPended[pend.key][pendedDrug.val.label].basketInfo.allBaskets}</b></div>\n          ${ ('0'+pendedDrug.val.transactions.length).slice(-2) } ${ pendedDrug.val.label }\n        </div>\n      </div>\n\n\n    </div>\n  </md-drawer>\n  <section class=\"mdl-grid au-animate\">\n    <div md-shadow=\"2\" class=\"mdl-card mdl-cell mdl-cell--3-col full-height hide-when-printed\"> <!-- ${ !repack || 'background:rgba(0,88,123,.3)' } -->\n      <div show.bind=\"transactions.length\" class=\"mdl-card__supporting-text\" style=\"padding-left:24px; white-space:nowrap\">\n        <div>\n          <div class=\"mdl-card__title\" style=\"padding:4px 0 8px 0\">\n            <div style=\"width:60%\"></div>\n            <div style=\"width:20%\">Qty</div>\n            <div style=\"width:20%\">Count</div>\n          </div>\n          <md-checkbox name = \"pro_checkall\" style=\"width:60%; margin-bottom:3px\" click.delegate=\"toggleVisibleChecks()\" checked.bind=\"filter.checked.visible\">Selected</md-checkbox>\n          <div style=\"width:18%; display:inline-block; vertical-align:top\">${filter.checked.qty}</div>\n          <div style=\"width:18%; display:inline-block; vertical-align:top\">${filter.checked.count}</div>\n        </div>\n        <div name = \"pro_ndc_filter\" repeat.for=\"ndc of filter.ndc | toArray:true\">\n          <div if.bind=\"$index == 0\" class=\"mdl-card__title\" style=\"padding:16px 0 4px 0\">\n            <div style=\"width:60%\">Ndc Filter</div>\n          </div>\n          <md-checkbox name = \"pro_checkbox\" style=\"width:60%; margin-bottom:3px\" click.delegate=\"refreshFilter(ndc)\" checked.bind=\"ndc.val.isChecked\">${ndc.key}</md-checkbox>\n          <div style=\"width:18%; display:inline-block; vertical-align:top\">${ndc.val.qty}</div>\n          <div style=\"width:18%; display:inline-block; vertical-align:top\">${ndc.val.count}</div>\n        </div>\n        <div name = \"pro_exp_filter\" repeat.for=\"exp of filter.exp | toArray:true\" style=\"padding:0\">\n          <div if.bind=\"$index == 0\" class=\"mdl-card__title\" style=\"padding:16px 0 4px 0\">\n            <div style=\"width:60%\">Exp Filter</div>\n          </div>\n          <md-checkbox name = \"pro_checkbox\" style=\"width:60%; margin-bottom:3px\" click.delegate=\"refreshFilter(exp)\" checked.bind=\"exp.val.isChecked\">${exp.key}</md-checkbox>\n          <div style=\"width:18%; display:inline-block; vertical-align:top\">${exp.val.qty}</div>\n          <div style=\"width:18%; display:inline-block; vertical-align:top\">${exp.val.count}</div>\n        </div>\n        <div name = \"pro_repack_filter\" repeat.for=\"repack of filter.repack | toArray:true\" style=\"padding:0\">\n          <div if.bind=\"$index == 0\" class=\"mdl-card__title\" style=\"padding:16px 0 4px 0\">\n            <div style=\"width:60%\">Repack Filter</div>\n          </div>\n          <md-checkbox name = \"pro_checkbox\" style=\"width:60%; margin-bottom:3px\" click.delegate=\"refreshFilter(repack)\" checked.bind=\"repack.val.isChecked\">${repack.key}</md-checkbox>\n          <div style=\"width:18%; display:inline-block; vertical-align:top\">${repack.val.qty}</div>\n          <div style=\"width:18%; display:inline-block; vertical-align:top\">${repack.val.count}</div>\n        </div>\n        <div name = \"pro_form_filter\" repeat.for=\"form of filter.form | toArray:true\" style=\"padding:0\">\n          <div if.bind=\"$index == 0\" class=\"mdl-card__title\" style=\"padding:16px 0 4px 0\">\n            <div style=\"width:60%\">Form Filter</div>\n          </div>\n          <md-checkbox name = \"pro_checkbox\" style=\"width:60%; margin-bottom:3px\" click.delegate=\"refreshFilter(form)\" checked.bind=\"form.val.isChecked\">${form.key}</md-checkbox>\n          <div style=\"width:18%; display:inline-block; vertical-align:top\">${form.val.qty}</div>\n          <div style=\"width:18%; display:inline-block; vertical-align:top\">${form.val.count}</div>\n        </div>\n      </div>\n      <div class=\"mdl-card__actions\" style=\"text-align:center\">\n        <md-button show.bind=\"type\" click.delegate=\"selectInventory(type, term)\">Show All Results</md-button>\n      </div>\n    </div>\n    <div md-shadow=\"2\" class=\"mdl-card mdl-cell mdl-cell--9-col full-height\">\n      <md-autocomplete\n        name = \"pro_searchbar\"\n        placeholder.bind=\"placeholder\"\n        value.bind=\"term\"\n        input.delegate=\"search() & debounce\"\n        keyup.delegate=\"scrollGroups($event) & debounce:50\"\n        style=\"margin:0px 24px; padding-right:15px\">\n        <table md-table>\n          <tr\n            name = \"pro_search_res\"\n            repeat.for=\"group of groups\"\n            click.delegate=\"selectTerm('generic', group.generic)\"\n            class=\"${ group.generic == term && 'is-selected'}\">\n            <td\n              style=\"min-width:70%\"\n              class=\"mdl-data-table__cell--non-numeric\"\n              innerHTML.bind=\"group.name | bold:term\">\n            </td>\n            <td style=\"max-width:30%\">\n              ${ account.ordered[group.generic] ? 'Price:$'+(account.ordered[group.generic].price30 ? account.ordered[group.generic].price30+'/30' : account.ordered[group.generic].price90+'/90')+' days, Min Qty:'+(account.ordered[group.generic].minQty || account.default.minQty) +', Min Days:'+(ordered[group.generic].minDays ||  account.default.minDays) : ''}\n            </td>\n          </tr>\n        </table>\n      </md-autocomplete>\n      <md-menu ref=\"menu\" name=\"pro_menu\" mousedown.delegate=\"openMenu($event)\" style=\"position:absolute; z-index:2; top:10px; right:5px;\">\n        <li\n          class=\"mdl-menu__item--full-bleed-divider\"\n          style =\"width:150px\"\n          name = \"pro_export\"\n          click.delegate=\"exportCSV()\">\n          Export Inventory\n        </li>\n        <li\n          style =\"width:150px\"\n          name = \"pro_dispense\"\n          disabled.bind=\" ! filter.checked.count\"\n          click.delegate=\"dispenseInventory()\">\n          Dispense Selected\n        </li>\n        <li\n          class=\"mdl-menu__item--full-bleed-divider\"\n          disabled.bind=\" ! filter.checked.count\"\n          click.delegate=\"disposeInventory()\">\n          Dispose Selected\n        </li>\n        <!-- workaround for boolean attributes https://github.com/aurelia/templating/issues/76 -->\n        <li\n          name=\"pro_pend\"\n          show.bind=\"term.slice(0,6) == 'Pended'\"\n          disabled.bind=\" ! filter.checked.count\"\n          click.delegate=\"unpendInventory()\">\n          Unpend Selected\n        </li>\n        <li\n          repeat.for=\"match of matches\"\n          name=\"pro_pend\"\n          class=\"mdl-menu__item\"\n          click.delegate=\"pendInventory(match.pendId, match.pendQty)\">\n          Pend to ${match.pendId}\n        </li>\n        <li\n          name=\"pro_pend\"\n          disabled.bind=\" ! filter.checked.count\"\n          click.delegate=\"pendInventory(pendToId, pendToQty)\"\n          class=\"mdl-menu__item--full-bleed-divider\">\n          Pend\n          <md-input\n            value.bind=\"pendToId\"\n            placeholder=\"Name\"\n            disabled.bind=\" ! filter.checked.count\"\n            style=\"width:40px; font-size:14px\">\n          </md-input>\n          <md-input\n            type=\"number\"\n            min.bind=\"1\"\n            value.bind=\"pendToQty\"\n            placeholder=\"Qty\"\n            disabled.bind=\" ! filter.checked.count\"\n            style=\"width:40px; font-size:14px\">\n          </md-input>\n        </li>\n        <li\n          name=\"pro_pick\"\n          disabled.bind=\" ! filter.checked.count\"\n          click.delegate=\"pickInventory(basketNumber)\"\n          class=\"mdl-menu__item--full-bleed-divider\">\n          Pick\n          <md-input\n            pattern=\"[s|S|r|R|b|B|g|G][0-9]{2,3}\"\n            value.bind=\"basketNumber\"\n            placeholder=\"Basket\"\n            disabled.bind=\" ! filter.checked.count\"\n            style=\"width:60px; font-size:14px\">\n          </md-input>\n        </li>\n        <li\n          name=\"pro_print_selected\"\n          disabled.bind=\" ! filter.checked.count\"\n          click.delegate=\"printLabels()\">\n          Print Selected\n        </li>\n        <form>\n          <li form\n            name=\"pro_repack_selected\"\n            disabled.bind=\" ! repacks.drug || ! filter.checked.count\"\n            click.delegate=\"repackInventory()\">\n            Repack Selected\n          </li>\n          <li repeat.for=\"repack of repacks\" style=\"padding:0 16px\">\n            <md-input\n              required.bind=\" ! $last\"\n              type=\"number\"\n              name = \"pro_repack_qty\"\n              value.bind=\"repack.qty | number\"\n              min.bind=\"1\"\n              max.bind=\"repack.qty + repacks.excessQty\"\n              input.delegate=\"setRepackRows(repack, $last, $index) & debounce:500\"\n              disabled.bind=\" ! filter.checked.count\"\n              style=\"width:40px;\">\n              Qty\n            </md-input>\n            <md-input\n              required.bind=\"repack.qty\"\n              name = \"pro_repack_exp\"\n              value.bind=\"repack.exp | date\"\n              pattern=\"(0?[1-9]|1[012])/(1\\d|2\\d)\"\n              disabled.bind=\" ! filter.checked.count\"\n              style=\"width:40px;\">\n              Exp\n            </md-input>\n            <md-input\n              required.bind=\"repack.qty\"\n              name = \"pro_repack_bin\"\n              value.bind=\"repack.bin\"\n              pattern=\"[A-Z]\\d{2}\"\n              disabled.bind=\" ! filter.checked.count\"\n              style=\"width:40px;\">\n              Bin\n            </md-input>\n          </li>\n        </form>\n      </md-menu>\n      <input ref=\"$file\" change.delegate=\"importCSV()\" style=\"display:none\" type=\"file\" />\n      <div class=\"table-wrap\">\n        <div show.bind=\"noResults\" style=\"margin:24px\">No Results</div>\n        <table show.bind=\" ! noResults && transactions.length\" md-table>\n          <thead>\n            <tr>\n              <th style=\"width:50px; padding:0\"></th>\n              <th class=\"mdl-data-table__cell--non-numeric\" style=\"padding-left:0\">Drug</th>\n              <th style=\"width:80px\" class=\"mdl-data-table__cell--non-numeric\">Form</th>\n              <th style=\"width:100px\" class=\"mdl-data-table__cell--non-numeric\">Ndc</th>\n              <th style=\"text-align:left; width:60px;\">Exp</th>\n              <th style=\"text-align:left; width:60px;\">Qty</th>\n              <th style=\"text-align:left; width:60px;\">Bin</th>\n              <th style=\"width:48px\"></th>\n            </tr>\n          </thead>\n          <tr name = \"pro_transaction\" repeat.for=\"transaction of transactions | inventoryFilter:filter:term\" input.delegate=\"saveAndReconcileTransaction(transaction) & debounce:1000\">\n            <td style=\"padding:0\">\n              <md-checkbox name = \"pro_transaction_checkbox\" click.delegate=\"toggleCheck(transaction)\" checked.bind=\"transaction.isChecked\"></md-checkbox>\n            </td>\n            <td class=\"mdl-data-table__cell--non-numeric\" style=\"padding-left:0; overflow:hidden\">${ transaction.drug.generic  & oneTime }</td>\n            <td class=\"mdl-data-table__cell--non-numeric\">${ transaction.drug.form  & oneTime }</td>\n            <td class=\"mdl-data-table__cell--non-numeric\">${ transaction.drug._id + (transaction.drug.pkg ? '-'+transaction.drug.pkg : '') & oneTime }</td>\n            <td style=\"padding:0\">\n              <md-input\n                name = \"pro_transaction_exp\"\n                id.bind=\"'exp_'+$index\"\n                required\n                keydown.delegate=\"expShortcuts($event, $index)\"\n                pattern=\"(0?[1-9]|1[012])/(1\\d|2\\d)\"\n                value.bind=\"transaction.exp.to | date\"\n                style=\"width:40px; margin-bottom:-8px\"\n                placeholder>\n              </md-input>\n            </td>\n            <td style=\"padding:0\">\n              <md-input\n                name = \"pro_transaction_qty\"\n                id.bind=\"'qty_'+$index\"\n                required\n                keydown.delegate=\"qtyShortcutsKeydown($event, $index)\"\n                input.trigger=\"qtyShortcutsInput($event, $index) & debounce:300\"\n                disabled.bind=\"transaction.next[0] && ! transaction.next[0].pended\"\n                type=\"number\"\n                value.bind=\"transaction.qty.to | number\"\n                style=\"width:40px; margin-bottom:-8px\"\n                max.bind=\"3000\"\n                placeholder>\n              </md-input>\n            </td>\n            <!-- <td style=\"padding:0\">\n              <md-input\n                value.bind=\"transaction.rx.from\"\n                style=\"width:40px; margin-bottom:-8px\"\n                placeholder>\n              </md-input>\n            </td> -->\n            <td style=\"padding:0\">\n              <md-input\n                name = \"pro_transaction_bin\"\n                id.bind=\"'bin_'+$index\"\n                required\n                keydown.delegate=\"binShortcuts($event, $index)\"\n                pattern=\"[A-Z]\\d{2}|[A-Za-z]\\d{3}\"\n                value.bind=\"transaction.bin\"\n                style=\"width:40px; margin-bottom:-8px; font-family:PT Mono; font-size:12.5px\"\n                maxlength.bind=\"4\"\n                placeholder>\n              </md-input>\n            </td>\n            <td name=\"pro_repack_icon\" style=\"padding:0 0 0 16px\">\n              <i name=\"pro_icon\" click.delegate=\"showHistoryDialog(transaction._id)\" show.bind=\"isRepack(transaction)\" class=\"material-icons\" style=\"font-size:20px; cursor:pointer\">delete_sweep</i>\n              <i name=\"pro_icon\" click.delegate=\"showHistoryDialog(transaction._id)\" show.bind=\"! isRepack(transaction)\" class=\"material-icons show-on-hover\" style=\"font-size:20px; margin-left:-2px; margin-right:2px; cursor:pointer\">history</i>\n            </td>\n          </tr>\n        </table>\n      </div>\n    </div>\n    <md-snackbar ref=\"snackbar\"></md-snackbar>\n    <dialog ref=\"dialog\" class=\"mdl-dialog\" style=\"width:800px; top:3%; height:90%; overflow-y:scroll\">\n    <h4 class=\"mdl-dialog__title\" style=\"padding: 3px 0\">History</h4>\n    <div class=\"mdl-dialog__content\" innerhtml.bind=\"history\" style=\"white-space:pre-wrap; font-family:monospace; padding:16px 2px\"></div>\n    <div class=\"mdl-dialog__actions\">\n      <md-button click.delegate=\"closeHistoryDialog()\">Close</md-button>\n    </div>\n  </dialog>\n  </section>\n</template>\n"; });
define('text!client/src/views/join.html', ['module'], function(module) { module.exports = "<template>\n  <require from='client/src/elems/md-shadow'></require>\n  <require from='client/src/elems/md-drawer'></require>\n  <require from=\"client/src/elems/md-input\"></require>\n  <require from=\"client/src/elems/md-select\"></require>\n  <require from=\"client/src/elems/md-button\"></require>\n  <require from=\"client/src/elems/md-checkbox\"></require>\n  <require from=\"client/src/elems/md-snackbar\"></require>\n  <require from=\"client/src/elems/md-loading\"></require>\n  <require from=\"client/src/elems/form\"></require>\n  <style>md-input { height:65px }</style>\n  <section class=\"mdl-grid\" style=\"height:80vh;\">\n    <form class=\"mdl-cell mdl-cell--11-col mdl-cell--middle mdl-grid\" style=\"margin:0 auto; max-width:930px\">\n      <div md-shadow=\"2\" class=\"mdl-card mdl-cell mdl-cell--6-col\" style=\"padding:16px\">\n        <div class=\"mdl-card__title\" style=\"padding-left:0\">\n          <div class=\"mdl-card__title-text\">\n            Register Your Facility\n          </div>\n        </div>\n        <md-input value.bind=\"account.name\" name = \"pro_facility\" required>Facility</md-input>\n        <md-input value.bind=\"account.license\" name = \"pro_license\" required>License</md-input>\n        <md-input value.bind=\"account.phone\" type=\"tel\" name = \"pro_facility_phone\" pattern=\"^\\d{3}[.-]?\\d{3}[.-]?\\d{4}$\" required>Facility Phone</md-input>\n        <md-input value.bind=\"account.street\" name = \"pro_street\" required>Street</md-input>\n        <div class=\"mdl-grid\" style=\"padding:0; margin:0 -8px\">\n          <md-input value.bind=\"account.city\" name = \"pro_city\" class=\"mdl-cell mdl-cell--7-col\" required>City</md-input>\n          <md-input value.bind=\"account.state\" name = \"pro_state\" pattern=\"^[A-Z]{2}$\" class=\"mdl-cell mdl-cell--2-col\" required>State</md-input>\n          <md-input value.bind=\"account.zip\" name = \"pro_zip\" pattern=\"^\\d{5}$\" class=\"mdl-cell mdl-cell--3-col\" required>Zip</md-input>\n        </div>\n      </div>\n      <div md-shadow=\"2\" class=\"mdl-card mdl-cell mdl-cell--6-col\" style=\"padding:16px\">\n        <div class=\"mdl-grid\" style=\"padding:0; margin:-8px\">\n          <md-input value.bind=\"user.name.first\" name = \"pro_first_name\" class=\"mdl-cell mdl-cell--6-col\" required>First Name</md-input>\n          <md-input value.bind=\"user.name.last\" name = \"pro_last_name\" class=\"mdl-cell mdl-cell--6-col\" required>Last Name</md-input>\n        </div>\n        <md-input value.bind=\"user.email\" type=\"email\" name = \"pro_email\" pattern=\"[\\w._-]{2,}@[\\w_-]{3,}\\.(com|org|net|gov)\" required>Email</md-input>\n        <md-input value.bind=\"user.phone\" type=\"tel\" name = \"pro_personal_phone\" pattern=\"^\\d{3}[.-]?\\d{3}[.-]?\\d{4}$\" required>Personal Phone</md-input>\n        <md-input value.bind=\"user.password\" name = \"pro_password\" required>Password</md-input>\n        <md-checkbox checked.bind=\"accept\" name = \"pro_checkbox\" style=\"margin:20px 0 28px\" required>I accept the terms of use</md-checkbox>\n        <md-button raised color form disabled.bind=\"disabled\" name = \"pro_install\" click.delegate=\"join()\">Install</md-button>\n        <md-loading value.bind=\"progress.docs_read/progress.doc_count * 100\"></md-loading>\n        <span class=\"mdl-color-text--grey-600\" style=\"margin-top:10px; height:20px; font-size:9px; margin-bottom:-8px\">${ progress.percent } ${ loading }</span>\n      </div>\n    </form>\n  </section>\n  <md-snackbar ref=\"snackbar\"></md-snackbar>\n</template>\n"; });
define('text!client/src/views/login.html', ['module'], function(module) { module.exports = "<template>\n  <require from='client/src/elems/md-shadow'></require>\n  <require from=\"client/src/elems/md-input\"></require>\n  <require from=\"client/src/elems/md-button\"></require>\n  <require from=\"client/src/elems/md-snackbar\"></require>\n  <require from=\"client/src/elems/md-loading\"></require>\n  <require from=\"client/src/elems/form\"></require>\n  <section class=\"mdl-grid\" style=\"margin-top:30vh;\">\n    <form md-shadow=\"2\" class=\"mdl-card mdl-cell mdl-cell--6-col mdl-cell--middle\" style=\"width:100%; margin:-75px auto 0; padding:48px 96px 28px 96px; max-width:450px\">\n      <md-input name = \"pro_phone\" value.bind=\"phone\" type=\"tel\" pattern=\"^\\d{3}[.-]?\\d{3}[.-]?\\d{4}$\" required>Phone</md-input>\n      <md-input name = \"pro_password\" value.bind=\"password\" type=\"password\" required minlength=\"4\">Password</md-input>\n      <md-button\n        name = \"pro_button\"\n        raised color form\n        click.delegate=\"login()\"\n        disabled.bind=\"disabled\"\n        style=\"padding-top:16px\">\n        Login\n      </md-button>\n      <md-loading value.bind=\"progress.docs_read/progress.doc_count * 100\"></md-loading>\n      <p class=\"mdl-color-text--grey-600\" style=\"margin-top:10px; height:20px; font-size:9px\">${ progress.percent } ${ loading }</p>\n    </form>\n  </section>\n  <md-snackbar ref=\"snackbar\"></md-snackbar>\n</template>\n"; });
define('text!client/src/views/picking.html', ['module'], function(module) { module.exports = "<template>\n  <require from='client/src/elems/md-shadow'></require>\n  <require from='client/src/elems/md-drawer'></require>\n  <require from='client/src/elems/md-table'></require>\n  <require from=\"client/src/elems/md-input\"></require>\n  <require from=\"client/src/elems/md-select\"></require>\n  <require from=\"client/src/elems/md-button\"></require>\n  <require from=\"client/src/elems/md-switch\"></require>\n  <require from=\"client/src/elems/md-snackbar\"></require>\n  <require from=\"client/src/elems/md-checkbox\"></require>\n  <require from=\"client/src/elems/md-autocomplete\"></require>\n  <require from=\"client/src/elems/md-menu\"></require>\n  <require from=\"client/src/elems/form\"></require>\n\n  <style>\n    .mdl-button:hover { background-color:initial , overflow-y:hidden}\n    .mdl-badge[data-badge]:after { font-size:9px; height:14px; width:14px; top:1px}\n  </style>\n\n\n  <section class=\"mdl-grid au-animate\">\n\n    <div if.bind = \"!orderSelectedToShop\">\n\n      <div>\n        Picked Today: ${pickedCount ? pickedCount : 0}\n      </div>\n\n      <md-input\n        autoselect\n        value.bind=\"pendedFilter\"\n        style=\"padding-bottom:15; font-size:18px; width:90vw;\">\n        Select Group\n      </md-input>\n\n      <div style=\"height:90vh; width:90vw; overflow-y:scroll\">\n        <div\n          repeat.for=\"pend of groups | pendedFilter:pendedFilter\"\n          click.delegate=\"selectGroup(pend.locked, pend.name)\"\n          class=\"mdl-typography--title ${ term == 'Pended '+pend.name ? 'mdl-navigation__link--current' : ''}\"\n          style=\"font-size:30px; overflow-x:scroll; width:90vw; font-weight:600; cursor:pointer; color: ${pend.locked ? '#919191' : (pend.priority ? '#14c44c' : 'black')}; padding-bottom: 50px;\">\n          ${pend.name}\n          <div if.bind = \"pend.baskets.length > 0\" style =\"font-size:15px;font-weight:200\">(${pend.baskets.join(\",\")})</div>\n          <md-button if.bind=\"pend.locked\" style=\"float:right; height:15px; line-height:10px\" color=\"accent\" raised click.delegate=\"unlockGroup(pend.name)\">${pend.locked == 'unlocking' ? '...unlocking...' : 'unlock'}</md-button>\n        </div>\n      </div>\n    </div>\n\n    <div if.bind = \"orderSelectedToShop\">\n\n      <div if.bind = \"!groupLoaded\" style=\"margin-top:40vh; margin-left:35vw; font-size:5vh\">\n        Loading...\n      </div>\n\n      <div if.bind = \"groupLoaded && !basketSaved\" style=\"width:100vw; height:100vh;\">\n        <div style = \"font-size:2.7vh; position:absolute; top:5px; left:20%; width:50%; line-height:5vh; text-align:center; overflow-x:hidden;\">${shopList[shoppingIndex].raw.next[0].pended.group}</div>\n\n        <div style=\"position:absolute; top:7vh; width:100%; font-size:4vh; display:inline-block\">\n          <div style=\"line-height:5vh\">${shopList[shoppingIndex].raw.drug.generic}</div>\n          <div style=\"font-size:3vh; line-height:4vh;\" if.bind = \"shopList[shoppingIndex].raw.drug.brand.length > 0\">${shopList[shoppingIndex].raw.drug.brand}</div>\n        </div>\n\n        <div style=\"position:absolute; top:24vh; width:100%\">\n          <form name=\"basket_adding_form\">\n\n            <div style=\"font-size:30px; line-height:10vh\">Enter new basket number:</div>\n            <div stlye=\"float:left; display:inline-block\">\n                <div style=\"float:left\">\n                  <md-select\n                    name = \"pro_basket_letter\"\n                    style=\"font-size: 20px; width:10vw; vertical-align:bottom; padding-top:23px\"\n                    value.bind=\"shopList[shoppingIndex].extra.basketLetter\"\n                    options.bind=\"basketOptions\"\n                  </md-select>\n                </div>\n                <md-input autofocus maxlength.bind=\"4\" pattern=\"${shopList[shoppingIndex].extra.basketLetter == 'G' ? '[0-9]{2}': '[4-9][0-9]{2,3}'}\" required type=\"tel\" style=\" font-size:20px; width:50vw;\" value.bind = \"shopList[shoppingIndex].extra.basketNumber\">Basket Number</md-input>\n                <div style=\"float:right; padding-right:7vw; margin-top:2vh\"><md-button color form = \"basket_adding_form\" raised click.delegate=\"saveBasketNumber()\">Save</md-button></div>\n            </div>\n\n          </form>\n        </div>\n\n        <md-button style=\"float:left; height:2vh; top:70vh; position:absolute; line-height:2vh;\" color click.delegate=\"pauseShopping(shopList[shoppingIndex].raw.next[0].pended.group)\">Pause</md-button>\n\n      </div>\n\n      <div style=\"width:100%; position:relative; overflow-y:hidden\" if.bind = \"groupLoaded && basketSaved\">\n\n        <div style=\"width:100%;display:inline-block;padding-bottom:0.5vh\">\n\n          <div style=\"float:left\">\n            <md-button style=\"float:left\" color raised show.bind=\"shoppingIndex>0\"click.delegate=\"moveShoppingBackward()\">Back</md-button>\n          </div>\n\n          <div style=\"font-size:2.7vh; position:absolute; top:5px; left:20%; width:50%; line-height:5vh; text-align:center; overflow-x:hidden;\">${shopList[shoppingIndex].raw.next[0].pended.group}</div>\n\n          <div style=\"float:right\" >\n            <md-button style=\"float:right\" disabled.bind=\"!formComplete\" color raised click.delegate=\"moveShoppingForward()\">${nextButtonText}</md-button>\n          </div>\n        </div>\n\n\n        <div style=\"width:100%; max-height:11vh; overflow-x:hidden\">\n          <div style=\"font-size:4.5vh; line-height:5vh;\">${shopList[shoppingIndex].raw.drug.generic}</div>\n          <div style=\"font-size:3vh; line-height:4vh;\" if.bind = \"shopList[shoppingIndex].raw.drug.brand.length > 0\">${shopList[shoppingIndex].raw.drug.brand}</div>\n        </div>\n\n        <div style=\"width:100%;display:inline-block; text-align:center;\">\n\n          <div style=\"float:left; text-align:left; width:47vw; height:100%;vertical-align:middle\">\n            <div style=\"font: 400 60px system-ui serif; line-height:60px; padding-bottom:15px; margin-top:20px;\"><b>${shopList[shoppingIndex].raw.bin.length == 3 ? shopList[shoppingIndex].raw.bin : (shopList[shoppingIndex].raw.bin.slice(0,3) + '-' + shopList[shoppingIndex].raw.bin.slice(3,4))}</b></div>\n            <div style=\"font-size:30px;padding-bottom:3vh\"><b>Qty:</b> ${shopList[shoppingIndex].raw.qty.to}</div>\n            <div style=\"font-size:20px; padding-bottom:2vh\"><b>Exp:</b> ${formatExp(shopList[shoppingIndex].raw.exp.to)}</div>\n          </div>\n          <div style=\"float:right; height:30vh; width:43vw; position:relative\">\n            <img\n              style=\"max-height:100%;max-width:100%;height:auto;width:auto;position:absolute;top:0;bottom:0;left:0;right:0;margin:auto\"\n              if.bind=\"shopList[shoppingIndex].extra.image\"\n              src.bind=\"shopList[shoppingIndex].extra.image\"/>\n          </div>\n        </div>\n\n        <div style=\"width:100%; display:inline-block; padding-bottom:0vh\">\n          <div style=\"width:45%; float:left; margin-top:3vh;\">\n              <div if.bind = \"(shoppingIndex < shopList.length - 1) && (shopList[shoppingIndex].raw.drug.generic == shopList[shoppingIndex+1].raw.drug.generic)\" style=\"font-size:3vh; line-height:3vh; padding-bottom:.5vh\">\n                <b>Next Bin: </b>\n                <span style=\"color:${shopList[shoppingIndex].raw.bin == shopList[shoppingIndex+1].raw.bin ? 'red' : ((shopList[shoppingIndex].raw.bin.length == 4) && (shopList[shoppingIndex].raw.bin.slice(0,-1) == shopList[shoppingIndex+1].raw.bin.slice(0,-1)) ? 'orange' : '')}\">\n                  ${shopList[shoppingIndex+1].raw.bin.length == 3 ? shopList[shoppingIndex+1].raw.bin : (shopList[shoppingIndex+1].raw.bin.slice(0,3) + '-' + shopList[shoppingIndex+1].raw.bin.slice(3,4))}\n                </span>\n              </div>\n              <div style=\"font-size:3vh; line-height:3vh; padding-bottom:1vh;\"><b>NDC:</b> ${shopList[shoppingIndex].raw.drug._id}</div>\n              <div>\n                <div class = \"mdl-button mdl-js-button mdl-js-ripple-effect\" click.delegate=\"addBasket(shoppingIndex)\" style=\"font-size:3vh; color:#00587B; padding-left:0; margin-top:.25vh; padding-bottom:1vh; padding-right:0px; padding-top:0px;height:3vh; line-height:3vh;\" >Basket:</div>\n                <span style= \"font-size:2.5vh; \">${(shopList[shoppingIndex].extra.fullBasket + currentGenericBaskets.replace(\",\" + shopList[shoppingIndex].extra.fullBasket,\"\"))}</span>\n              </div>\n              <div style=\"font-size:2vh; line-height:2vh; padding-top:2vh; padding-bottom:0.5vh\">Item <b>${shopList[shoppingIndex].extra.genericIndex.relative_index[0]}</b> of <b>${shopList[shoppingIndex].extra.genericIndex.relative_index[1]}</b></div>\n              <div style=\"font-size:2vh; line-height:2vh; padding-bottom:0,5vh\">Total <b>${shoppingIndex+1}</b> of <b>${shopList.length}</b></div>\n              <div style=\"font-size:2vh; line-height:2vh; padding-bottom:3vh\">Drug <b>${shopList[shoppingIndex].extra.genericIndex.global_index[0]}</b> of <b>${shopList[shoppingIndex].extra.genericIndex.global_index[1]}</b></div>\n              <div style=\"display:inline-block;\">\n                 <md-button style=\"float:left; height:2vh; line-height:2vh;\" color click.delegate=\"pauseShopping(shopList[shoppingIndex].raw.next[0].pended.group)\">Pause</md-button>\n                 <md-button if.bind = \"(shoppingIndex < shopList.length - 1) && (shopList[shoppingIndex].raw.drug.generic == shopList[shoppingIndex+1].raw.drug.generic)\" style=\"float:right; height:2vh; line-height:2vh\" color click.delegate=\"skipItem()\">Skip</md-button>\n              </div>\n          </div>\n          <div style=\"width:50%; float:right; margin-top:2vh\">\n            <div style=\"width:40vw; text-align:center; font-size:3vh; line-height:5vh; height:5vh; padding-top:0.75vh; padding-bottom:0.75vh; color: ${shopList[shoppingIndex].extra.outcome.exact_match ? 'white':''}; background-color: ${shopList[shoppingIndex].extra.outcome.exact_match ? '#00587b':''}\"     class=\"mdl-button mdl-js-button mdl-js-ripple-effect\"\n            click.delegate=\"selectShoppingOption('exact_match')\" checked.bind=\"shopList[shoppingIndex].extra.outcome.exact_match\">Exact Match</div>\n            <div style=\"width:40vw;  text-align:center; font-size:3vh; line-height:5vh; height:5vh; padding-top:0.75vh; padding-bottom:0.75vh;  color: ${shopList[shoppingIndex].extra.outcome.roughly_equal ? 'white':''}; background-color: ${shopList[shoppingIndex].extra.outcome.roughly_equal ? '#00587b':''}\"     class=\"mdl-button mdl-js-button mdl-js-ripple-effect ${ color } ${ (raised || raised === '') && 'mdl-button--raised' } \"\n            click.delegate=\"selectShoppingOption('roughly_equal')\" checked.bind=\"shopList[shoppingIndex].extra.outcome.roughly_equal\">+/- 3 Qty</div>\n            <div style=\"width:40vw;  text-align:center; font-size:3vh; line-height:5vh; height:5vh; padding-top:0.75vh; padding-bottom:0.75vh;  color: ${shopList[shoppingIndex].extra.outcome.slot_before ? 'white':''}; background-color: ${shopList[shoppingIndex].extra.outcome.slot_before ? '#00587b':''}\"     class=\"mdl-button mdl-js-button mdl-js-ripple-effect ${ color } ${ (raised || raised === '') && 'mdl-button--raised' } \"\n            click.delegate=\"selectShoppingOption('slot_before')\" checked.bind=\"shopList[shoppingIndex].extra.outcome.slot_before\">Slot Before</div>\n            <div style=\"width:40vw;  text-align:center; font-size:3vh; line-height:5vh; height:5vh; padding-top:0.75vh; padding-bottom:0.75vh;  color: ${shopList[shoppingIndex].extra.outcome.slot_after ? 'white':''}; background-color: ${shopList[shoppingIndex].extra.outcome.slot_after ? '#00587b':''}\"     class=\"mdl-button mdl-js-button mdl-js-ripple-effect ${ color } ${ (raised || raised === '') && 'mdl-button--raised' } \"\n            click.delegate=\"selectShoppingOption('slot_after')\" checked.bind=\"shopList[shoppingIndex].extra.outcome.slot_after\">Slot After</div>\n            <div style=\"width:40vw;  text-align:center; font-size:3vh; line-height:5vh; height:5vh;padding-top:0.75vh; padding-bottom:0.75vh;  color: ${shopList[shoppingIndex].extra.outcome.missing ? 'white':''}; background-color: ${shopList[shoppingIndex].extra.outcome.missing ? '#00587b':''}\"     class=\"mdl-button mdl-js-button mdl-js-ripple-effect ${ color } ${ (raised || raised === '') && 'mdl-button--raised' } \"\n            click.delegate=\"selectShoppingOption('missing')\" checked.bind=\"shopList[shoppingIndex].extra.outcome.missing\">Missing</div>\n          </div>\n        </div>\n\n        <div style=\"margin:auto; font-size:7px\">\n          ${shopList[shoppingIndex].raw._id}\n        </div>\n\n        <div>\n          <md-snackbar ref=\"snackbar\"></md-snackbar>\n        </div>\n\n      </div>\n    </div>\n\n  </section>\n</template>\n"; });
define('text!client/src/views/routes.html', ['module'], function(module) { module.exports = "<template>\n  <div class=\"mdl-layout mdl-js-layout mdl-layout--fixed-header\">\n    <header class=\"mdl-layout__header hide-when-printed\">\n      <div class=\"mdl-layout__header-row\">\n        <svg style=\"height:70%; margin-left:-60px\" id=\"Layer_1\" width=\"200\" version=\"1.1\" xmlns:x=\"&amp;ns_extend;\" xmlns:i=\"&amp;ns_ai;\" xmlns:graph=\"&amp;ns_graphs;\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\" viewBox=\"0 0 1920 737\" style=\"enable-background:new 0 0 1920 737;\" xml:space=\"preserve\">\n            <style type=\"text/css\">\n              .st0{fill:#3E4454;}\n              .st1{fill:#2291F8;}\n            </style>\n            <switch>\n              <foreignObject requiredExtensions=\"&amp;ns_ai;\" x=\"0\" y=\"0\" width=\"1\" height=\"1\">\n                <i:pgfref xlink:href=\"#adobe_illustrator_pgf\"></i:pgfref>\n              </foreignObject>\n              <g i:extraneous=\"self\">\n                <g>\n                  <g>\n                    <g>\n                      <path class=\"st0\" d=\"M936.21,505.42h-65.3c-15.02,0-29.12-6.14-37.71-16.43c-5.52-6.61-8.43-14.42-8.43-22.61V445.5            c0-7.72,6.26-13.99,13.99-13.99s13.99,6.26,13.99,13.99v20.88c0,1.57,0.65,3.15,1.93,4.68c2.58,3.09,8.2,6.39,16.24,6.39h65.3            c10.4,0,18.17-5.84,18.17-11.07v-3.65c0-50.36-26.7-62.73-60.5-78.39c-33.1-15.33-74.28-34.41-74.28-98.52v-3.65            c0-21.52,20.7-39.04,46.14-39.04h67.19c25.44,0,46.14,17.51,46.14,39.04v24.58c0,7.72-6.26,13.99-13.99,13.99            s-13.99-6.26-13.99-13.99v-24.58c0-5.22-7.77-11.07-18.17-11.07h-67.19c-10.4,0-18.17,5.84-18.17,11.07v3.65            c0,46.24,25.63,58.11,58.07,73.14c34.18,15.83,76.71,35.54,76.71,103.77v3.65C982.34,487.91,961.65,505.42,936.21,505.42z\"></path>\n                    </g>\n                    <g>\n                      <path class=\"st0\" d=\"M1539.63,505.42h-31.75c-41.3,0-74.89-33.6-74.89-74.89V257.12c0-7.72,6.26-13.99,13.99-13.99            c7.72,0,13.99,6.26,13.99,13.99v173.41c0,25.87,21.05,46.92,46.92,46.92h31.75c25.87,0,46.92-21.05,46.92-46.92V257.12            c0-7.72,6.26-13.99,13.99-13.99c7.72,0,13.99,6.26,13.99,13.99v173.41C1614.52,471.83,1580.92,505.42,1539.63,505.42z\"></path>\n                    </g>\n                    <g>\n                      <path class=\"st0\" d=\"M1083.31,507.71c-7.72,0-13.99-6.26-13.99-13.99v-237.5c0-7.72,6.26-13.99,13.99-13.99            c7.72,0,13.99,6.26,13.99,13.99v237.5C1097.3,501.45,1091.04,507.71,1083.31,507.71z\"></path>\n                    </g>\n                    <g>\n                      <path class=\"st0\" d=\"M1200.89,507.71c-7.72,0-13.99-6.26-13.99-13.99v-236.6c0-7.72,6.26-13.99,13.99-13.99h90.93            c28.36,0,51.44,23.07,51.44,51.44v43.26c0,28.36-23.08,51.44-51.44,51.44h-76.95v104.45            C1214.88,501.45,1208.62,507.71,1200.89,507.71z M1214.88,361.3h76.95c12.94,0,23.47-10.53,23.47-23.47v-43.26            c0-12.94-10.53-23.47-23.47-23.47h-76.95V361.3z\"></path>\n                    </g>\n                    <g>\n                      <path class=\"st0\" d=\"M1339.71,507.71c-4.83,0-9.53-2.51-12.12-6.99l-66.43-114.97c-3.86-6.69-1.57-15.24,5.11-19.11            c6.69-3.86,15.25-1.57,19.11,5.11l66.43,114.97c3.86,6.69,1.57,15.24-5.11,19.11C1344.49,507.1,1342.08,507.71,1339.71,507.71z            \"></path>\n                    </g>\n                    <g>\n                      <path class=\"st0\" d=\"M1906.01,507.15c-7.72,0-13.99-6.26-13.99-13.99V315.99l-68.38,138.91c-2.35,4.78-7.22,7.81-12.55,7.81            c-5.33,0-10.19-3.03-12.55-7.81l-68.38-138.91v177.17c0,7.72-6.26,13.99-13.99,13.99c-7.72,0-13.99-6.26-13.99-13.99V255.92            c0-6.5,4.48-12.15,10.82-13.62c6.32-1.48,12.85,1.61,15.72,7.44l82.37,167.32l82.37-167.32c2.87-5.83,9.39-8.92,15.72-7.44            c6.33,1.47,10.82,7.12,10.82,13.62v237.24C1920,500.88,1913.74,507.15,1906.01,507.15z\"></path>\n                    </g>\n                  </g>\n                    <path class=\"st1\" d=\"M604.45,130.92L411.49,19.52C366.42-6.5,310.88-6.5,265.8,19.52L72.85,130.92C27.77,156.95,0,205.05,0,257.1        v222.8c0,52.05,27.77,100.15,72.85,126.18l192.95,111.4c45.08,26.03,100.62,26.03,145.69,0l192.95-111.4        c45.08-26.03,72.85-74.12,72.85-126.18V257.1C677.29,205.05,649.52,156.95,604.45,130.92z M568.58,406.37        c0,13-5.07,25.22-14.27,34.4c-9.18,9.17-21.37,14.21-34.34,14.21c-0.03,0-0.06,0-0.08,0l-13-0.02        c-88.13,0-132.33-40.27-175.08-79.21c-41.58-37.88-80.86-73.66-160.54-73.66h-13.94c-15.7,0-28.47,12.77-28.47,28.47v73.98        c0,19.7,16.03,35.73,35.73,35.73l154.58,0.17c59.34,0.06,111.39,47.64,111.39,101.83c0,30.81-25.07,55.87-55.88,55.87H302.6        c-30.81,0-55.87-25.07-55.87-55.87c0-0.35,0.02-0.7,0.05-1.04v-29.99c0-5.56,4.51-10.07,10.07-10.07        c5.56,0,10.07,4.51,10.07,10.07v30.93c0,0.31-0.01,0.63-0.04,0.94c0.45,19.31,16.3,34.89,35.72,34.89h72.09        c19.7,0,35.73-16.03,35.73-35.73c0-38.51-39.03-81.63-91.27-81.68l-154.57-0.17c-30.8,0-55.87-25.07-55.87-55.87v-73.98        c0-26.8,21.81-48.61,48.61-48.61h13.94c87.48,0,131.51,40.11,174.1,78.91c41.75,38.03,81.19,73.96,161.53,73.96l13.01,0.02        c0.02,0,0.03,0,0.05,0c7.6,0,14.73-2.95,20.11-8.32c5.39-5.38,8.35-12.53,8.35-20.15v-73.92c0-19.7-16.03-35.73-35.73-35.73        l-148.42-0.16c-54.49-0.06-117.84-44.55-117.84-101.83c0-30.81,25.07-55.87,55.88-55.87h72.09c30.81,0,55.88,25.07,55.88,55.87        c0,0.35-0.02,0.7-0.05,1.04v29.99c0,5.56-4.51,10.07-10.07,10.07s-10.07-4.51-10.07-10.07v-30.93c0-0.31,0.01-0.63,0.04-0.94        c-0.45-19.31-16.3-34.89-35.72-34.89h-72.09c-19.7,0-35.73,16.03-35.73,35.73c0,45.2,53.46,81.64,97.72,81.69l148.41,0.16        c30.8,0,55.86,25.07,55.86,55.87V406.37z\"></path>\n                  </g>\n                </g>\n            </switch>\n        </svg>\n        <span class=\"mdl-layout-title\"></span>\n        <!-- Add spacer, to align navigation to the right -->\n        <div class=\"mdl-layout-spacer\"></div>\n        <nav class=\"mdl-navigation\">\n          <a repeat.for=\"route of routes\" show.bind=\"route.isVisible\" class=\"mdl-navigation__link ${route.isActive ? 'mdl-navigation__link--current' : ''}\" href.bind=\"route.href\" style=\"\">\n            ${route.title}\n          </a>\n        </nav>\n      </div>\n    </header>\n    <main class=\"mdl-layout__content\">\n      <!-- http://stackoverflow.com/questions/33636796/chrome-safari-not-filling-100-height-of-flex-parent -->\n      <router-view style=\"display:block;\"></router-view>\n    </main>\n  </div>\n</template>\n"; });
define('text!client/src/views/shipments.html', ['module'], function(module) { module.exports = "<template>\n  <require from='client/src/elems/md-shadow'></require>\n  <require from='client/src/elems/md-drawer'></require>\n  <require from='client/src/elems/md-table'></require>\n  <require from=\"client/src/elems/md-input\"></require>\n  <require from=\"client/src/elems/md-select\"></require>\n  <require from=\"client/src/elems/md-switch\"></require>\n  <require from=\"client/src/elems/md-checkbox\"></require>\n  <require from=\"client/src/elems/md-button\"></require>\n  <require from=\"client/src/elems/md-menu\"></require>\n  <require from=\"client/src/elems/md-autocomplete\"></require>\n  <require from=\"client/src/elems/md-snackbar\"></require>\n  <require from=\"client/src/elems/form\"></require>\n  <md-drawer autofocus>\n    <md-input\n      id=\"drawer_filter\"\n      name = \"pro_filter_input\"\n      value.bind=\"filter\"\n      autoselect\n      style=\"padding:0 8px; width:auto\">\n      ${instructionsText}\n    </md-input>\n    <!-- <md-switch\n      checked.one-way=\"role.account == 'to'\"\n      click.delegate=\"swapRole()\"\n      style=\"margin:-33px 0 0 185px;\">\n    </md-switch> -->\n    <a\n      name = \"new_shipment\"\n      if.bind=\" ! filter\"\n      class=\"mdl-navigation__link ${ ! shipmentId ? 'mdl-navigation__link--current' : ''}\"\n      click.delegate=\"selectShipment(null, true)\">\n      <div class=\"mdl-typography--title\">New Shipment</div>\n      or add inventory\n    </a>\n    <a\n      name = \"pro_shipments\"\n      repeat.for=\"shipment of shipments[role.shipments] | shipmentFilter:filter\"\n      class=\"mdl-navigation__link ${ shipment._id == shipmentId ? 'mdl-navigation__link--current' : ''}\"\n      click.delegate=\"selectShipment(shipment, true)\">\n      <div class=\"mdl-typography--title\" innerHtml.bind=\"shipment.account[role.accounts].name | bold:filter\"></div>\n      <div style=\"font-size:12px\" innerHtml.bind=\"shipment._id.slice(11, 21)+', '+(shipment.tracking.slice(-6) || shipment.tracking) | bold:filter\"></div>\n    </a>\n    <md-select\n      name = \"pro_year_choice\"\n      change.delegate=\"refocusWithNewShipments()\"\n      input.delegate=\"gatherShipments() & debounce:100\"\n      style=\"font-size: 20px; width:45px; margin:auto\"\n      value.bind=\"shipmentDrawerYear\"\n      options.bind=\"shipmentDrawerYearChoices\">\n    </md-select>\n  </md-drawer>\n  <section class=\"mdl-grid au-animate\">\n    <form md-shadow=\"2\" class=\"mdl-card mdl-cell mdl-cell--3-col full-height\">\n      <div class=\"mdl-card__title\" style=\"display:block;\">\n        <div class=\"mdl-card__title-text\" style=\"text-transform:capitalize\">\n          ${ shipment._rev ? 'Shipment '+(shipment.tracking.slice(-6) || shipment.tracking) : 'New Shipment '+role.accounts+' You' }\n        </div>\n        <div style=\"margin-top:3px; margin-bottom:-25px\">\n          <strong>${transactions.length}</strong> items worth\n          <strong>$${ transactions | value:0:transactions.length }</strong>\n        </div>\n      </div>\n      <div class=\"mdl-card__supporting-text\" style=\"font-size:16px;\">\n        <md-select\n          if.bind=\"role.shipments == 'from' || shipment._rev\"\n          change.delegate=\"setCheckboxes()\"\n          style=\"width:100%\"\n          value.bind=\"shipment\"\n          default.bind=\"{tracking:'New Tracking #', account:{from:account, to:account}}\"\n          options.bind=\"shipments[role.shipments]\"\n          property=\"tracking\">\n          Tracking #\n        </md-select>\n        <md-input\n          name = \"pro_tracking_input\"\n          if.bind=\"role.shipments == 'to' && ! shipment._rev\"\n          focusin.delegate=\"setCheckboxes()\"\n          autofocus\n          required\n          style=\"width:100%\"\n          pattern=\"[a-zA-Z\\d]{6,}\"\n          value.bind=\"shipment.tracking\">\n          Tracking #\n        </md-input>\n        <md-select\n          name = \"pro_from_option\"\n          style=\"width:100%;\"\n          value.bind=\"shipment.account.from\"\n          options.bind=\"(role.accounts == 'to' || shipment._rev) ? [shipment.account.from] : accounts[role.accounts]\"\n          property=\"name\"\n          required\n          disabled.bind=\"role.accounts == 'to'\">\n          <!-- disabled is for highlighting the current role -->\n          From\n        </md-select>\n        <md-select\n          style=\"width:100%;\"\n          value.bind=\"shipment.account.to\"\n          options.bind=\"(role.accounts == 'from' || shipment._rev) ? [shipment.account.to] : accounts[role.accounts]\"\n          property=\"name\"\n          required\n          disabled.bind=\"role.accounts == 'from'\">\n          <!-- disabled is for highlighting the current role -->\n          To\n        </md-select>\n        <md-select\n          style=\"width:32%;\"\n          value.bind=\"shipment.status\"\n          options.bind=\"stati\"\n          disabled.bind=\"! shipment._rev\">\n          Status\n        </md-select>\n        <md-input\n          type=\"date\"\n          style=\"width:64%; margin-top:20px\"\n          value.bind=\"shipment[shipment.status+'At']\"\n          disabled.bind=\"! shipment._rev\"\n          input.delegate=\"saveShipment() & debounce:1500\">\n        </md-input>\n        <!-- <md-select\n          style=\"width:100%\"\n          value.bind=\"attachment.name\"\n          change.delegate=\"getAttachment()\"\n          options.bind=\"['','Shipping Label', 'Manifest']\"\n          disabled.bind=\" ! shipment._id || shipment._id != tracking._id\">\n          Attachment\n        </md-select>\n        <md-button color\n          if.bind=\"attachment.name\"\n          click.delegate=\"upload.click()\"\n          style=\"position:absolute; right:18px; margin-top:-48px; height:24px; line-height:24px\"\n          disabled.bind=\" ! shipment._id || shipment._id != tracking._id\">\n          Upload\n        </md-button>\n        <input\n          type=\"file\"\n          ref=\"upload\"\n          change.delegate=\"setAttachment(upload.files[0])\"\n          style=\"display:none\">\n        <div if.bind=\"attachment.url\" style=\"width: 100%; padding-top:56px; padding-bottom:129%; position:relative;\">\n          <embed\n            src.bind=\"attachment.url\"\n            type.bind=\"attachment.type\"\n            style=\"position:absolute; height:100%; width:100%; top:0; bottom:0\">\n        </div> -->\n        <!-- The above padding / positioning keeps a constant aspect ratio for the embeded pdf  -->\n      </div>\n      <div class=\"mdl-card__actions\">\n        <md-button color raised form\n          name = \"pro_create_button\"\n          ref=\"newShipmentButton\"\n          style=\"width:100%\"\n          show.bind=\"shipment._id == shipmentId && ! shipment._rev\"\n          click.delegate=\"createShipment()\">\n          New Shipment Of ${ diffs.length || 'No' } Items\n        </md-button>\n        <md-button color raised\n          ref=\"moveItemsButton\"\n          style=\"width:100%\"\n          show.bind=\"shipment._id != shipmentId\"\n          disabled.bind=\"! diffs.length || ! shipment.account.to._id\"\n          click.delegate=\"shipment._rev ? moveTransactionsToShipment(shipment) : createShipment()\">\n          Move ${ diffs.length } Items\n        </md-button>\n      </div>\n    </form>\n    <div md-shadow=\"2\" class=\"mdl-card mdl-cell mdl-cell--9-col full-height\">\n      <!-- disabled.bind=\"! searchReady\" -->\n      <md-autocomplete\n        name = \"pro_searchbar\"\n        value.bind=\"term\"\n        input.delegate=\"search() & debounce:50\"\n        keydown.delegate=\"autocompleteShortcuts($event) & debounce:50\"\n        style=\"margin:0px 24px\">\n        <table md-table>\n          <tr\n            repeat.for=\"drug of drugs\"\n            click.delegate=\"addTransaction(drug)\"\n            class=\"${ drug._id == $parent.drug._id && 'is-selected'}\">\n            <td innerHTML.bind=\"drug.generic | bold:term\" style=\"white-space:normal;\" class=\"mdl-data-table__cell--non-numeric\" ></td>\n            <td innerHTML.bind=\"drug.labeler\" style=\"width:1%\" class=\"mdl-data-table__cell--non-numeric\" ></td>\n            <td innerHTML.bind=\"drug._id + (drug.pkg ? '-'+drug.pkg : '')\" style=\"width:1%\" class=\"mdl-data-table__cell--non-numeric\" ></td>\n          </tr>\n        </table>\n      </md-autocomplete>\n      <md-menu style=\"position:absolute; z-index:2; top:10px; right:5px;\">\n        <!-- workaround for boolean attributes https://github.com/aurelia/templating/issues/76 -->\n        <li\n          show.bind=\"transactions.length\"\n          click.delegate=\"exportCSV()\">\n          Export CSV\n        </li>\n        <li\n          show.bind=\"!transactions.length\"\n          disabled>\n          Export CSV\n        </li>\n        <li\n          show.bind=\"role.accounts != 'to' || shipment._rev\"\n          click.delegate=\"$file.click()\">\n          Import CSV\n        </li>\n        <li\n          show.bind=\"role.accounts == 'to' && ! shipment._rev\"\n          disabled>\n          Import CSV\n        </li>\n      </md-menu>\n      <input ref=\"$file\" change.delegate=\"importCSV()\" style=\"display:none\" type=\"file\" />\n      <div class=\"table-wrap\">\n        <table md-table>\n          <thead>\n            <tr>\n              <th style=\"width:56px\"></th>\n              <th class=\"mdl-data-table__cell--non-numeric\" style=\"padding-left:0\">Drug</th>\n              <th style=\"width:100px;\" class=\"mdl-data-table__cell--non-numeric\">Ndc</th>\n              <th style=\"width:40px; padding-left:0; padding-right:0px\">Value</th>\n              <th style=\"text-align:left; width:60px;\">Exp</th>\n              <th style=\"text-align:left; width:60px\">Qty</th>\n              <!-- 84px account for the 24px of padding-right on index.html's css td:last-child -->\n              <th style=\"text-align:left; width:84px;\">Bin</th>\n            </tr>\n          </thead>\n          <tbody>\n            <tr style=\"padding-top:7px;\" name = \"pro_transaction\" repeat.for=\"transaction of transactions\" input.delegate=\"saveTransaction(transaction) & debounce:1500\">\n              <td style=\"padding:0 0 0 8px\">\n                <!-- if you are selecting new items you received to add to inventory, do not confuse these with the currently checked items -->\n                <!-- if you are selecting items to move to a new shipment, do not allow selection of items already verified by recipient e.g do not mix saving new items and removing old items, you must do one at a time -->\n                <!-- since undefined != false we must force both sides to be booleans just to show a simple inequality. use next[0].disposed directly rather than isChecked because autocheck coerces isChecked to be out of sync -->\n                <md-checkbox\n                  name = \"pro_checkbox\"\n                  click.delegate=\"manualCheck($index)\"\n                  disabled.bind=\" ! moveItemsButton.offsetParent && ! newShipmentButton.offsetParent && transaction.isChecked && transaction.next[0]\"\n                  checked.bind=\"transaction.isChecked\">\n                </md-checkbox>\n\n              </td>\n              <td click.delegate=\"focusInput('#exp_'+$index)\" class=\"mdl-data-table__cell--non-numeric\" style=\"padding-left:0; overflow:hidden\">\n                ${ transaction.drug.generic & oneTime }\n              </td>\n              <td click.delegate=\"focusInput('#exp_'+$index)\" class=\"mdl-data-table__cell--non-numeric\" style=\"padding:0\">\n                ${ transaction.drug._id + (transaction.drug.pkg ? '-'+transaction.drug.pkg : '') & oneTime }\n              </td>\n              <td style=\"padding:0\">\n                ${ transaction | value:2:transaction.qty[role.shipments] }\n              </td>\n              <td style=\"padding:0\">\n                ${ transaction.exp[role.accounts] | date & oneTime }\n                <md-input\n                  name = \"pro_exp\"\n                  id.bind=\"'exp_'+$index\"\n                  required\n                  keydown.delegate=\"expShortcutsKeydown($event, $index)\"\n                  input.trigger=\"expShortcutsInput($index)\"\n                  disabled.bind=\"transaction.isChecked && transaction.next[0]\"\n                  pattern=\"(0?[1-9]|1[012])/(1\\d|2\\d)\"\n                  value.bind=\"transaction.exp[role.shipments] | date\"\n                  style=\"width:40px; margin-bottom:-8px\"\n                  placeholder>\n                </md-input>\n              </td>\n              <td style=\"padding:0\">\n                ${ transaction.qty[role.accounts] & oneTime }\n                  <!-- input event is not triggered on enter, so use keyup for qtyShortcutes instead   -->\n                  <!-- keyup rather than keydown because we want the new quantity not the old one -->\n                  <md-input\n                    name = \"pro_qty\"\n                    id.bind=\"'qty_'+$index\"\n                    required\n                    keydown.delegate=\"qtyShortcutsKeydown($event, $index)\"\n                    input.trigger=\"qtyShortcutsInput($event, $index)\"\n                    disabled.bind=\"transaction.isChecked && transaction.next[0]\"\n                    type=\"number\"\n                    value.bind=\"transaction.qty[role.shipments] | number\"\n                    style=\"width:40px; margin-bottom:-8px\"\n                    max.bind=\"3000\"\n                    placeholder>\n                  </md-input>\n              </td>\n              <!-- disable if not checked because we don't want a red required field unless we are keeping the item -->\n              <td style=\"padding:0\">\n                <md-input\n                  name = \"pro_bin\"\n                  id.bind=\"'bin_'+$index\"\n                  required\n                  disabled.bind=\" ! transaction.isChecked || transaction.next[0] || shipment._id != shipmentId\"\n                  keyup.delegate=\"setBin(transaction) & debounce:1500\"\n                  keydown.delegate=\"binShortcuts($event, $index)\"\n                  pattern.bind=\"shipment._rev ? '[A-Za-z][0-6]\\\\d{2}' : '[A-Za-z][0-6]?\\\\d{2}'\"\n                  maxlength.bind=\"4\"\n                  value.bind=\"transaction.bin\"\n                  style=\"width:40px; margin-bottom:-8px; font-family:PT Mono; font-size:12.5px\"\n                  placeholder>\n                </md-input>\n              </td>\n            </tr>\n          </tbody>\n        </table>\n      </div>\n    </div>\n    <md-snackbar ref=\"snackbar\"></md-snackbar>\n    <dialog ref=\"dialog\" class=\"mdl-dialog\">\n    <h4 class=\"mdl-dialog__title\">Drug Warning</h4>\n    <div class=\"mdl-dialog__content\">${drug.warning}</div>\n    <div class=\"mdl-dialog__actions\">\n      <md-button click.delegate=\"dialogClose()\">Close</md-button>\n    </div>\n  </dialog>\n  </section>\n</template>\n"; });