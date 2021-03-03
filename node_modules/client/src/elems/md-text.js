import {bindable, bindingMode} from 'aurelia-framework';

@bindable({name:'value', defaultBindingMode: bindingMode.twoWay})
@bindable('disabled')
@bindable('placeholder')
@bindable('required')
@bindable('autofocus')
export class MdTextCustomElement {

  valueChanged() {
    setTimeout(_=> {
      this.div && this.div.MaterialTextfield && this.div.MaterialTextfield.checkDirty()
      this.div && this.div.MaterialTextfield && this.div.MaterialTextfield.checkValidity()
    })
  }

  disabledChanged() {
    setTimeout(_ => {
      this.div && this.div.MaterialTextfield && this.div.MaterialTextfield.checkDisabled()
      this.div && this.div.MaterialTextfield && this.div.MaterialTextfield.checkValidity()
    }) //disabled hasn't actually been changed yet so wait for the change and then check
  }

  attached() {
    componentHandler.upgradeElement(this.div)

    if ( ! this.placeholder)
      this.div.classList.remove('has-placeholder')

    if (this.autofocus || this.autofocus === '')
      this.div.MaterialTextfield.input_.focus()
  }
}
