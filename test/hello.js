import Component from '../src/component.js';
import { h } from '../src/h.js';

class MyStatefulComponent extends Component {};
describe('A spec suite', function() {
    it('contains a passing spec', function() {
        const vNode = h(MyStatefulComponent, null, h('div'));
        console.info(vNode);
    });
});