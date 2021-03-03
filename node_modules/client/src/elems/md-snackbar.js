import {bindable, inject} from 'aurelia-framework';

@bindable('show')
@inject(Element)
export class MdSnackbarCustomElement {

  constructor(element) {
    this.element = element
  }

  attached() {
    componentHandler.upgradeElement(this.element)
    this.element.show = opts => {
      if (typeof opts == 'string')
        opts = {message:opts, timeout:5000}

      this.element.MaterialSnackbar.showSnackbar(opts)
    }
    this.element.error = (msg, err) => {
      if ( ! err) {
        err = msg
        msg = ''
      }
      msg = `${msg} ${err.message}`
      this.element.show(msg)
      console.error(msg, err)
      return err
    }
  }
}
