import { VNodeFlags, ChildFlags } from './flags.js';
import { createTextVNode } from './h.js';
import { typeOf } from './utils.js';
// ?:无需捕获括号中的内容~优化匹配性能
// \W 用于匹配所有与\w不匹配的字符，即非字母、数字、下划线，主要用于元素上绑定的变量等场景比如<div :><>
const DOM_PROPS_RE = /[A-Z]|^(?:value|checked|selected|muted)$/;

/**
 * 渲染器，根据当前有无VNode调用mount或者patch
 * @param {*} vnode 
 * @param {*} container 挂载点
 */
function render(vnode, container) {
    const prevVNode = container.vnode;
    if (!prevVNode) {
        if (vnode) {
            mount(vnode, container);
            container.vnode = vnode;
        }
    } else {
        if (vnode) {
            patch(prevVNode, vnode, container);
            container.vnode = vnode;
        } else {
            container.removeChild(prevVNode.el);
            container.vnode = null;
        }
    }
}

/**
 * 根据VNode的类型，调用不同的挂载函数将VNode渲染成真实的Dom
 * @param {*} vnode 
 * @param {*} container 
 * @param {*} isSvg 
 */
function mount(vnode, container, isSvg, refNode) {
    const { flags } = vnode;
    if (flags & VNodeFlags.ELEMENT) {
        mountElement(vnode, container, isSvg, refNode);
    } else if (flags & VNodeFlags.COMPONENT) {
        mountComponent(vnode, container, isSvg);
    } else if (flags & VNodeFlags.TEXT) {
        mountText(vnode, container);
    } else if (flags & VNodeFlags.FRAGMENT) {
        mountFragment(vnode, container, isSvg);
    } else if (flags & VNodeFlags.PORTAL) {
        mountPortal(vnode, container);
    }
}

function mountElement(vnode, container, isSvg, refNode) {
    // <svg>的子元素标签名不是svg，但又确实是svg标签，所以优先以外部传进来的参数判断是否是svg元素，
    // 当发现当前元素是<svg>时，它的子元素也就一定是svg相关的元素了
    const _isSvg = isSvg || vnode.flags & VNodeFlags.ELEMENT_SVG;
    const { data, children, childFlags } = vnode;
    const el = _isSvg
        ? document.createElementNS('http://www.w3.org/2000/svg', vnode.tag)
        : document.createElement(vnode.tag);
    el.setAttribute('svg', _isSvg);
    if (data) {
        for (let key in data) {
            const nextValue = data[key];
            patchData(null, nextValue, key, el);
        }
    }

    if (childFlags & ChildFlags.SINGLE_VNODE) {
        mount(children, el, _isSvg);
    } else if (childFlags & ChildFlags.MULTIPLE_VNODES) {
        for (let i = 0, len = children.length; i < len; i++) {
            mount(children[i], el, _isSvg);
        }
    }

    refNode ? container.insertBefore(el, refNode) : container.appendChild(el);
    vnode.el = el;
}

function mountText(vnode, container) {
    const el = document.createTextNode(vnode.children);
    container.appendChild(el);
    vnode.el = el;
}

function mountFragment(vnode, container, isSvg) {
    // 这里依然要传入isSvg
    // 考虑场景，<svg>VNode的子元素是Fragment包含的多个svg相关的元素的时候
    const _isSvg = isSvg || vnode.flags & VNodeFlags.ELEMENT_SVG;
    const { children, childFlags } = vnode;
    if (childFlags & ChildFlags.SINGLE_VNODE) {
        if (typeOf(children, 'array')) {
            mount(children[0], container, _isSvg);
            vnode.el = children[0].el;
        } else {
            mount(children, container, _isSvg);
            vnode.el = children.el;
        }
    } else if (childFlags & ChildFlags.MULTIPLE_VNODES) {
        for (let i = 0, len = children.length; i < len; i++) {
            mount(children[i], container, _isSvg);
        }
        vnode.el = children[0].el;
    } else {
        const textNode = createTextVNode('');
        mountText(textNode, container);
        vnode.el = textNode.el;
    }
}

function mountPortal(vnode, container) {
    const _container = typeOf(vnode.tag, 'string')
        ? document.querySelector(vnode.tag)
        : vnode.tag;
    // const _isSvg = +_container.getAttribute('svg');
    const { children, childFlags } = vnode;
    if (childFlags & ChildFlags.SINGLE_VNODE) {
        if (Array.isArray(children)) {
            mount(children[0], _container);
        } else {
            mount(children, _container);
        }
    } else if (childFlags & ChildFlags.MULTIPLE_VNODES) {
        for (let i = 0, len = children.length; i < len; i++) {
            mount(children[i], _container);
        }
    }
    // Portal的子元素被挂载到了指定的_container中
    // 而Portal自己这个VNode的el指向mount的时候传入的container的空文本节点
    const textNode = createTextVNode('');
    mountText(textNode, container);
    vnode.el = textNode.el;
}

function mountComponent(vnode, container, isSvg) {
    if (vnode.flags & VNodeFlags.COMPONENT_STATEFUL) {
        mountStatefulComponent(vnode, container, isSvg);
    } else {
        mountFunctionalComponent(vnode, container, isSvg);
    }
}

function mountStatefulComponent(vnode, container, isSvg) {
    const instance = new vnode.tag();
    vnode.children = instance;
    instance.$props = (vnode.data && vnode.data.props) || null;
    instance._update = function () {
        if (instance._mounted) {
            const prevVNode = instance.$vnode;
            instance.$vnode = instance.render();
            const nextVNode = instance.$vnode;
            patch(prevVNode, nextVNode, prevVNode.el.parentNode);
            vnode.el = instance.$vnode.el;
        } else {
            instance.$vnode = instance.render();
            mount(instance.$vnode, container, isSvg);
            vnode.el = instance.$vnode.el;
            instance._mounted = true;
            instance.mounted && instance.mounted();
        }
    }

    instance._update();
}

function mountFunctionalComponent(vnode, container, isSvg) {
    vnode.handle = {
        prev: null,
        next: vnode,
        container,
        update: () => {
            if (vnode.handle.prev) {
                const prevVNode = vnode.handle.prev;
                const nextVnode = vnode.handle.next;
                const prevChildren = prevVNode.children;
                const props = nextVnode.data.props;
                const nextChildren = nextVnode.tag(props);
                nextVnode.children = nextChildren;
                patch(prevChildren, nextChildren, vnode.handle.container);
                vnode.el = nextChildren.el;
            } else {
                const props = vnode.data && vnode.data.props;
                const _vnode = vnode.tag(props);
                vnode.children = _vnode;
                mount(_vnode, container, isSvg);
                vnode.el = _vnode.el;
            }
        }
    };
    vnode.handle.update();
}

function patch(prevVNode, nextVNode, container) {
    const prevFlags = prevVNode.flags;
    const nextFlags = nextVNode.flags;
    if (prevFlags !== nextFlags) {
        replaceVNode(prevVNode, nextVNode, container);
    } else if (nextFlags & VNodeFlags.ELEMENT) {
        patchElement(prevVNode, nextVNode, container);
    } else if (nextFlags & VNodeFlags.TEXT) {
        patchText(prevVNode, nextVNode);
    } else if (nextFlags & VNodeFlags.FRAGMENT) {
        patchFragment(prevVNode, nextVNode, container);
    } else if (nextFlags & VNodeFlags.PORTAL) {
        patchPortal(prevVNode, nextVNode, container);
    } else if (nextFlags & VNodeFlags.COMPONENT) {
        patchComponent(prevVNode, nextVNode, container);
    }
}

function replaceVNode(prevVNode, nextVNode, container) {
    container.removeChild(prevVNode.el);
    if (prevVNode.flags & VNodeFlags.COMPONENT_STATEFUL_NORMAL) {
        // 类型为有状态组件的 VNode，其 children 属性被用来存储组件实例对象
        const instance = prevVNode.children;
        instance.unmounted && instance.unmounted();
    }
    mount(nextVNode, container);
}

function patchElement(prevVNode, nextVNode, container) {
    if (prevVNode.tag !== nextVNode.tag) {
        replaceVNode(prevVNode, nextVNode, container);
        return;
    }

    const prevData = prevVNode.data;
    const nextData = nextVNode.data;
    const el = prevVNode.el;
    nextVNode.el = prevVNode.el;
    if (nextData) {
        for (let key in nextData) {
            const prevValue = prevData[key];
            const nextValue = nextData[key];
            patchData(prevValue, nextValue, key, el);
        }
    }

    if (prevData) {
        // 删除新VNode上没有而旧VNode上有的属性
        for (let key in prevData) {
            const prevValue = prevData[key];
            if (!nextData.hasOwnProperty(key)) {
                patchData(prevValue, null, key, el);
            }
        }
    }

    patchChildren(prevVNode, nextVNode, el);
}

function patchText(prevVNode, nextVNode) {
    const el = prevVNode.el;
    nextVNode.el = prevVNode.el;
    if (prevVNode.children !== nextVNode.children) {
        el.nodeValue = nextVNode.children;
    }
}

function patchData(prevValue, nextValue, key, el) {
    switch (key) {
        case 'style':
            el.style = {};
            for (let styleKey in nextValue) {
                // 当key=style的时候 nextValue对象格式的样式数据由外部 h 函数生成VNode的时候保证
                el.style[styleKey] = nextValue[styleKey];
            }
            break;
        case 'class':
            // 当key=class的时候 nextValue 'class1 class2 ... classn'格式的字符串由外部 h函数生成VNode的时候保证
            el.className = nextValue;
            break;
        default:
            if (key.indexOf('on') === 0) {
                const event = key.slice(2);
                if (event) {
                    if (prevValue) {
                        el.removeEventListener(key.slice(2), prevValue);
                    }
                    if (nextValue) {
                        el.addEventListener(key.slice(2), nextValue);
                    }
                }
            } else if (DOM_PROPS_RE.test(key)) {
                // 区分处理像 value|checked|selected|muted等属性~
                // 因为只要出现了就会生效，无论设置的值是什么（problem-demo/demo1.html）
                el[key] = nextValue;
            } else {
                el.setAttribute(key, nextValue);
            }
            break;
    }
}

function patchChildren(prevVNode, nextVNode, container) {
    const _prevChildFlags = prevVNode.childFlags;
    const _nextChildFlags = nextVNode.childFlags;
    const _prevChildren = _prevChildFlags === ChildFlags.SINGLE_VNODE
        ? typeOf(prevVNode.children, 'Array')
            ? prevVNode.children[0]
            : prevVNode.children
        : prevVNode.children;
    const _nextChildren = _nextChildFlags === ChildFlags.SINGLE_VNODE
        ? typeOf(nextVNode.children, 'Array')
            ? nextVNode.children[0]
            : nextVNode.children
        : nextVNode.children;

    switch (_prevChildFlags) {
        case ChildFlags.NO_CHILDREN:
            switch (_nextChildFlags) {
                case ChildFlags.NO_CHILDREN:
                    break;
                case ChildFlags.SINGLE_VNODE:
                    mount(_nextChildren, container);
                    break;
                default:
                    for (let i = 0, len = _nextChildren.length; i < len; i++) {
                        const child = _nextChildren[i];
                        mount(child, container);
                    }
                    break;
            }
            break;
        case ChildFlags.SINGLE_VNODE:
            switch (_nextChildFlags) {
                case ChildFlags.NO_CHILDREN:
                    // container.removeChild(_prevChildren.el);
                    container.innerHTML = ''; // 当子节点是portal的时候会有问题
                    break;
                case ChildFlags.SINGLE_VNODE:
                    patch(_prevChildren, _nextChildren, container);
                    break;
                default:
                    container.innerHTML = ''; // 当子节点是portal的时候会有问题
                    for (let i = 0, len = _nextChildren.length; i < len; i++) {
                        const child = _nextChildren[i];
                        mount(child, container);
                    }
                    break;
            }
            break;
        default:
            switch (_nextChildFlags) {
                case ChildFlags.NO_CHILDREN:
                    container.innerHTML = '';
                    break;
                case ChildFlags.SINGLE_VNODE:
                    container.innerHTML = '';
                    mount(_nextChildren, container);
                    break;
                default:
                    let lastIndex = 0; // 当在旧节点中存在与新节点key对应的节点时，新节点在旧节点中的最大索引值
                    for (let i = 0, nextLen = _nextChildren.length; i < nextLen; i++) {
                        const nextChild = _nextChildren[i];
                        let isNewNode = true;
                        for (let j = 0, prevLen = _prevChildren.length; j < prevLen; j++) {
                            const prevChild = _prevChildren[j];
                            if (prevChild.key === nextChild.key) {
                                isNewNode = false;
                                patch(prevChild, nextChild, container);
                                if (j < lastIndex) {
                                    // 当前节点在旧节点列表中的位置靠前，需要移动
                                    const refNode = _nextChildren[i - 1].el.nextSibling;
                                    container.insertBefore(nextChild.el, refNode);
                                } else {
                                    lastIndex = j;
                                }
                                break;
                            }
                        }
                        if(isNewNode) {
                            const refNode = i === 0 ? _prevChildren[0].el : _nextChildren[i - 1].el.nextSibling;
                            mount(nextChild, container, false, refNode);
                        }
                    }
                    for(let i = 0, len = _prevChildren.length; i < len; i++) {
                        const prevChild = _prevChildren[i];
                        const has = _nextChildren.find(item => item.key === prevChild.key);
                        if(!has) {
                            container.removeChild(prevChild.el);
                        }
                    }
                    break;
            }
            break;
    }
}

function patchFragment(prevVNode, nextVNode, container) {
    patchChildren(prevVNode, nextVNode, container);

    switch (nextVNode.childFlags) {
        case ChildFlags.NO_CHILDREN:
            nextVNode.el = prevVNode.el;
            break;
        case ChildFlags.SINGLE_VNODE:
            nextVNode.el = typeOf(nextVNode.children, 'Array')
                ? nextVNode.children[0].el
                : nextVNode.children.el
            break;
        default:
            nextVNode.el = nextVNode.children[0].el;
            break;
    }
}

function patchPortal(prevVNode, nextVNode) {
    const _nextChildren = nextVNode.childFlags === ChildFlags.SINGLE_VNODE
        ? typeOf(nextVNode.children, 'Array')
            ? nextVNode.children[0]
            : nextVNode.children
        : nextVNode.children;
    const _prevContainer = typeOf(prevVNode.tag, 'string')
        ? document.querySelector(prevVNode.tag)
        : prevVNode.tag;

    patchChildren(prevVNode, nextVNode, _prevContainer);
    nextVNode.el = prevVNode.el;
    if (prevVNode.tag !== nextVNode.tag) {
        const _nextContainer = typeOf(nextVNode.tag, 'string')
            ? document.querySelector(nextVNode.tag)
            : nextVNode.tag;
        switch (nextVNode.childFlags) {
            case ChildFlags.NO_CHILDREN:
                break;
            case ChildFlags.SINGLE_VNODE:
                _nextContainer.appendChild(_nextChildren.el);
                break;
            default:
                for (let i = 0, len = _nextChildren.length; i < len; i++) {
                    _nextContainer.appendChild(_nextChildren[i].el);
                }
                break;
        }

    }
}

function patchComponent(prevVNode, nextVNode, container) {
    if (nextVNode.tag !== prevVNode.tag) {
        replaceVNode(prevVNode, nextVNode, container);
    } else if (nextVNode.flags & VNodeFlags.COMPONENT_STATEFUL) {
        const instance = prevVNode.children;
        nextVNode.children = prevVNode.children;
        instance.$props = nextVNode.data && nextVNode.data.props;
        instance._update();
    } else {
        // 更新函数式组件
        const handle = prevVNode.handle;
        handle.prev = prevVNode;
        handle.next = nextVNode;
        handle.container = container;
        handle.update();
    }
    nextVNode.el = prevVNode.el;
}

export { render };