import {inject} from 'aurelia-framework';

@inject(Element)
export class MdShadowCustomAttribute {

  constructor(element) {
    element.classList.add("mdl-shadow--"+element.getAttribute('md-shadow')+"dp")
  }
}
