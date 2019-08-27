const compVNode = Vue.h(ParentComponent);
    生成ParentComponent对应的VNode
    {
        tag: ParentComponent,
        el: null,
        childFlags: no_child,
        children: null,
        data: null,
        flags: 有状态组件
    }

class ParentComponent {
    localState = 'one';

    mounted() {
        // 两秒钟后将 localState 的值修改为 'two'
        setTimeout(() => {
            this.localState = 'two';
            this._update();
        }, 2000);
    }

    render() {
        childComVnode = Vue.h(ChildComponent, {
            // 父组件向子组件传递的 props
            props: {
                text: this.localState
            }
        });
        return childComVnode;
    }
}

Vue.render(compVNode, document.getElementById('app'));
    mount(compVNode, document.getElementById('app'));
        mountComponent(compVNode, document.getElementById('app'), isSvg=null);
            mountStatefulComponent(compVNode, document.getElementById('app'), isSvg=null);
                const instance = new vnode.tag();
                const instance = new ParentComponent();
                instance.$props = (vnode.data && vnode.data.props) || null;
                instance._update = function () {}
                instance = ParentComponent {localState: "one", $props: null, _update: function};
                compVNode.children = instance;
                compVNode = {
                    tag: ParentComponent,
                    el: null,
                    childFlags: no_child,
                    children: ParentComponent {localState: "one", $props: null, _update: function},
                    data: null,
                    flags: 有状态组件
                }
                instance._update();
                    instance.$vnode = instance.render() = Vue.h(ChildComponent, { props: { text: this.localState } });
                    compVNode.children = instance.$vnode = {
                        tag: ƒ ChildComponent(props),
                        el: null,
                        childFlags: no_child,
                        children: null,
                        data: {
                            props: {
                                text: this.localState = "one"
                            }
                        }
                        flags: 函数组件
                    }
                    mount(ChildComponent, document.getElementById('app'), isSvg=null);
                        
                    instance.mounted && instance.mounted();