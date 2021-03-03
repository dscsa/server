import {inject} from 'aurelia-framework';

@inject(Element)
export class MdTableCustomAttribute {

  constructor(element) {

    element.classList.add("mdl-data-table")
    element.classList.add("mdl-js-data-table")
    element.style.border = "none"

    if (element.getAttribute('md-table'))
      element.classList.add("mdl-data-table--selectable")

    this.element = element
    //this.checkboxes = element.querySelector('')
  }

  valueChanged(selectable) {

    let checkboxes = this.element.querySelectorAll('input[type="checkbox"]')

    for (var i=0; i < checkboxes.length; i++) {
      checkboxes[i].disabled = selectable == 'false'
    }
  }

  attached() {
    componentHandler.upgradeElement(this.element)
  }
}
