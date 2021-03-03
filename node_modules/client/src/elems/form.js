import {inject, bindable} from 'aurelia-framework';

@bindable('disabled')
@inject(Element)
export class FormCustomAttribute {

  constructor(element) {
    this.element = element
    this.change  = this.change.bind(this)
  }

  change() {

    if (this.value == 'onchange' && this.serialize() == this.initialValue)
      return this.inputElement.disabled = true

    //Here we cached response because assigning to elem.disabled everytime
    //does not work if more than one input toggles on disabled (e.g., repacking form)
    const valid = this.formElement && this.formElement.checkValidity()
    this.inputElement.disabled = ! valid
  }

  attached() {
    //TODO allow attribute value to specify the form by name.
    //TODO a detached method.  Are these event listeners leaking?
    this.formElement = this.element.closest('form')
    this.formElement.addEventListener('change', this.debounce(this.change, 150))
    this.formElement.addEventListener('input', this.debounce(this.change, 150))

    this.inputElement = this.element.querySelector('input,button,select') || this.element

    this.initialValue = this.serialize()
    //When going "back" to "Create New Shipment" form.checkValidity() would return true
    //initially and then turn to false. setTimeout seems to eliminate this problem
    setTimeout(this.change)
  }

  serialize() {
    let s = []
    for (let field of this.formElement.elements) {
      if (field.type != 'select-multiple')
        s.push(field.value)
      else
        for (let option of field.options)
          if(option.selected)
            s.push(option.value)
    }
    return s.join('&')
  }

  //https://davidwalsh.name/javascript-debounce-function
  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds.
  debounce(func, wait) {
  	let timeout
  	return function() {
  		clearTimeout(timeout)
  		timeout = setTimeout(_ => {
  			timeout = null
  			func.apply(this, arguments)
  		}, wait)
  	}
  }
}
