import {inject, bindable, bindingMode, TaskQueue} from 'aurelia-framework';

@bindable({name:'value', defaultBindingMode: bindingMode.twoWay})
@bindable('disabled')
@bindable('pattern')
@bindable('step')
@bindable('type')
@bindable('placeholder')
@bindable('input')
@bindable('max')
@bindable('min')
@bindable('required')
@bindable('minlength')
@bindable('maxlength')
@bindable('autofocus')
@inject(TaskQueue)
export class MdInputCustomElement {

  constructor(taskQueue) {
    this.taskQueue = taskQueue
  }

  valueChanged() {
    this.changed('checkDirty')
  }

  disabledChanged() {
    this.changed('checkDisabled')
  }

  maxChanged() {
    this.changed()
  }

  minChanged() {
    this.changed()
  }

  maxlengthChanged() {
    this.changed()
  }

  minlengthChanged() {
    this.changed()
  }

  requiredChanged() {
    this.changed()
  }

  patternChanged() {
    this.changed()
  }

  changed(methodName) {
    this.taskQueue.queueTask(_=> {
      if ( ! this.div || ! this.div.MaterialTextfield) return

      methodName && this.div.MaterialTextfield[methodName]()

      this.div.MaterialTextfield.checkValidity()

      if ( ! this.input.validity.valid)
        console.log('invalid input:', this.input.value, this.input.pattern, this.input.validity)

      this.div.MaterialTextfield.input_.dispatchEvent(new Event('change', {bubbles:true})) //this is to trigger formCustomAttribute and others to reevaluate
    })
  }

  attached() {
    componentHandler.upgradeElement(this.div)

    if ( ! this.placeholder && this.type != 'date')
      this.div.classList.remove('has-placeholder')

    if (this.autofocus || this.autofocus === '')
      this.div.MaterialTextfield.input_.focus()
  }
}
