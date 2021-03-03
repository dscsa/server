import {bindable, bindingMode, inject} from 'aurelia-framework';

@bindable('value')
export class MdLoadingCustomElement {

  valueChanged(val) {
    setTimeout(_=> this.div && this.div.MaterialProgress.setProgress(Math.min(val, 100)))
  }

  attached() {
    componentHandler.upgradeElement(this.div)
  }
}
