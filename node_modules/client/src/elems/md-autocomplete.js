import {bindable, bindingMode} from 'aurelia-framework';

@bindable({name:'value', defaultBindingMode: bindingMode.twoWay})
@bindable('disabled')
@bindable('placeholder')
export class MdAutocompleteCustomElement {
  toggleResults($event) {
    //Foucusout removes the results from the view before the click on
    //the selected result can register.  Delaying a bit prevents this
    //http://stackoverflow.com/questions/18848738/click-event-not-triggered-after-focusout-event
    setTimeout(() => this.showResults = ! this.showResults, 200)
  }
}
