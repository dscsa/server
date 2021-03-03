import {bindable, bindingMode, inject} from 'aurelia-framework';

@bindable({name:'value', defaultBindingMode: bindingMode.twoWay})
@bindable('style')
@bindable('options')
@bindable('disabled')
@bindable('default')
@bindable('required')
@bindable('property')
export class MdSelectCustomElement {

  //need when toggling back and forth on shipments page to make sure from/to account disables where updated
  disabledChanged() {
    setTimeout(_=> this.div && this.div.MaterialTextfield && this.div.MaterialTextfield.checkDisabled())
  }

  valueChanged() {
    setTimeout(_=> this.div && this.div.MaterialTextfield && this.div.MaterialTextfield.checkDirty())
  }

  attached() {
    componentHandler.upgradeElement(this.div)
  }
}
