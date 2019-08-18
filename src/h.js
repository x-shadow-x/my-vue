import { VNodeFlags, ChildFlags } from './flags.js';
const Fragment = Symbol('Fragment');
const Portal = Symbol('Portal');

/**
 * h函数用来创建各种类型的VNode
 */
function h(tag, data = null, children = null) {
    let flags = null;
    let childFlags = null;
    if(typeof tag === 'string') {
        flags = tag === 'svg' ? VNodeFlags.ELEMENT_SVG : VNodeFlags.ELEMENT_HTML;
    } else if(tag === Fragment) {
        flags = VNodeFlags.FRAGMENT;
    } else if(tag === Portal) {
        flags = VNodeFlags.PORTAL;
        tag = data && data.target;
    } else {
        flags = tag.prototype && tag.prototype.render
            ? VNodeFlags.COMPONENT_STATEFUL_NORMAL
            : VNodeFlags.COMPONENT_FUNCTIONAL
    }

    if(Array.isArray(children)) {
        const { length } = children;
        if(length === 0) {
            childFlags = ChildFlags.NO_CHILDREN;
        } else if(length === 1) {
            childFlags = ChildFlags.SINGLE_VNODE;
        } else if(length > 0) {
            childFlags = ChildFlags.KEY_VODES;
            children = normalizeVNode(children);
        }
    } else if(children == null) {
        childFlags = ChildFlags.NO_CHILDREN;
    }  else if(children._isVNode) {
        childFlags = ChildFlags.SINGLE_VNODE;
    } else {
        childFlags = ChildFlags.SINGLE_VNODE;
        children = createTextVNode(`${children}`);
    }
    return {
        _isVNode: true,
        tag,
        flags,
        data,
        children,
        childFlags,
        el: null
    };
}

/**
 * 处理children，如果用户未添加key，则处理添加key
 * @param {待处理VNode集合} children 
 */
function normalizeVNode(children) {
    const newChildren = [];
    for(let i = 0, len = children.length; i < len; i++) {
        const item = children[i];
        if(item.key == null) {
            item.key = `φ${i}`;
        }
        newChildren.push(item);
    }
    return newChildren;
}

function createTextVNode(text) {
    return {
        _isVNode: true,
        tag: null,
        data: null,
        children: text,
        flags: VNodeFlags.TEXT,
        childFlags: ChildFlags.NO_CHILDREN
    }
}

export { Fragment, Portal, h, createTextVNode };