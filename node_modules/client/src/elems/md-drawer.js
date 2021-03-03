import {inject} from 'aurelia-framework';

let drawer = document.createElement('nav')
drawer.classList.add("mdl-layout__drawer")
//console.log('drawer was created')

@inject(Element)
export class MdDrawerCustomElement {

  constructor(element) {
    element.classList.add("mdl-navigation")
    element.style['padding-top'] = '6px'

    this.autofocus = element.hasAttribute('autofocus')
    //Move md-nav into the drawer
    drawer.appendChild(element)
    //console.log('drawer was constructed')
  }

  attached() {
    this.header = document.querySelector('.mdl-layout__header')
    this.header.parentNode.insertBefore(drawer, this.header.nextSibling)

    componentHandler.upgradeAllRegistered() ///tried upgradeElement on this.element, drawer, this.header, this.button but all caused the drawer menu button to disappear
    //componentHandler.upgradeDom()

    this.button = document.querySelector('.mdl-layout__drawer-button')

    if (this.button)
      this.button.style.display = 'block'

    if (this.autofocus && this.header.firstChild && this.header.firstChild.click)
      this.header.firstChild.click()
  }

  detached() {
    //New drawer is attached before old drawer is detached so children.length == 2
    //except if going to view without a drawer (e.g login) in which length == 1
    //console.log('detached', drawer.children.length)
    if (drawer.children.length == 1 && this.button)
      this.button.style.display = 'none'

    //Empty the drawer
    drawer.removeChild(drawer.firstChild)
  }
}
