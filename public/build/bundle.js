
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src\App.svelte generated by Svelte v3.16.7 */

    const file = "src\\App.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[43] = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[48] = list[i].name;
    	child_ctx[46] = list[i].room;
    	child_ctx[49] = list[i].value;
    	child_ctx[50] = list;
    	child_ctx[51] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[46] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[52] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[46] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[48] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    function get_each_context_7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[56] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    // (843:1) {#if gui.deviceSelectOpen}
    function create_if_block_9(ctx) {
    	let div3;
    	let div2;
    	let p;
    	let t1;
    	let div0;
    	let ul;
    	let t2;
    	let div1;
    	let button;
    	let dispose;
    	let each_value_7 = /*config*/ ctx[0].device;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_7.length; i += 1) {
    		each_blocks[i] = create_each_block_7(get_each_context_7(ctx, each_value_7, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Выберите устройство";
    			t1 = space();
    			div0 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Закрыть";
    			attr_dev(p, "class", "leaf svelte-mmtspu");
    			add_location(p, file, 845, 4, 17114);
    			attr_dev(ul, "class", "ul svelte-mmtspu");
    			attr_dev(ul, "id", "deviceSelectList");
    			add_location(ul, file, 847, 5, 17234);
    			attr_dev(div0, "id", "mutListPlayers");
    			attr_dev(div0, "class", "deviceListPlayers deviceSelectButton svelte-mmtspu");
    			add_location(div0, file, 846, 4, 17158);
    			attr_dev(button, "id", "deviceSelectCloseButton");
    			attr_dev(button, "class", "button svelte-mmtspu");
    			add_location(button, file, 857, 5, 17660);
    			attr_dev(div1, "class", "deviceSelectCloseButton svelte-mmtspu");
    			add_location(div1, file, 856, 4, 17617);
    			attr_dev(div2, "class", "mutlist svelte-mmtspu");
    			add_location(div2, file, 844, 3, 17088);
    			attr_dev(div3, "id", "floatwindow");
    			attr_dev(div3, "class", "svelte-mmtspu");
    			add_location(div3, file, 843, 2, 17061);
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[18], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				each_value_7 = /*config*/ ctx[0].device;
    				let i;

    				for (i = 0; i < each_value_7.length; i += 1) {
    					const child_ctx = get_each_context_7(ctx, each_value_7, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_7(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_7.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(843:1) {#if gui.deviceSelectOpen}",
    		ctx
    	});

    	return block;
    }

    // (849:6) {#each config.device as device,id}
    function create_each_block_7(ctx) {
    	let li;
    	let input;
    	let input_value_value;
    	let input_id_value;
    	let t0;
    	let label;
    	let div;
    	let t1_value = /*device*/ ctx[56] + "";
    	let t1;
    	let label_for_value;
    	let t2;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			div = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(input, "type", "radio");
    			input.__value = input_value_value = /*id*/ ctx[42];
    			input.value = input.__value;
    			attr_dev(input, "id", input_id_value = "radioDevice" + /*id*/ ctx[42]);
    			attr_dev(input, "name", "radioDevice");
    			attr_dev(input, "class", "inputDevice svelte-mmtspu");
    			/*$$binding_groups*/ ctx[17][3].push(input);
    			add_location(input, file, 850, 8, 17344);
    			attr_dev(div, "class", "button selectorDevice svelte-mmtspu");
    			add_location(div, file, 851, 37, 17506);
    			attr_dev(label, "for", label_for_value = "radioDevice" + /*id*/ ctx[42]);
    			attr_dev(label, "class", "svelte-mmtspu");
    			add_location(label, file, 851, 8, 17477);
    			attr_dev(li, "class", "li svelte-mmtspu");
    			add_location(li, file, 849, 7, 17320);
    			dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[16]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, input);
    			input.checked = input.__value === /*config*/ ctx[0].selectDevice;
    			append_dev(li, t0);
    			append_dev(li, label);
    			append_dev(label, div);
    			append_dev(div, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				input.checked = input.__value === /*config*/ ctx[0].selectDevice;
    			}

    			if (dirty[0] & /*config*/ 1 && t1_value !== (t1_value = /*device*/ ctx[56] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			/*$$binding_groups*/ ctx[17][3].splice(/*$$binding_groups*/ ctx[17][3].indexOf(input), 1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_7.name,
    		type: "each",
    		source: "(849:6) {#each config.device as device,id}",
    		ctx
    	});

    	return block;
    }

    // (863:1) {#if gui.mutList}
    function create_if_block_8(ctx) {
    	let div3;
    	let div2;
    	let p;
    	let t1;
    	let input;
    	let t2;
    	let div0;
    	let t3;
    	let div1;
    	let button;
    	let dispose;
    	let each_value_6 = /*mutList*/ ctx[5];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		each_blocks[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Мут лист игроков:";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Закрыть";
    			attr_dev(p, "class", "leaf svelte-mmtspu");
    			add_location(p, file, 865, 4, 17885);
    			attr_dev(input, "class", "input-text leaf mut-leaf svelte-mmtspu");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Введите никнейм");
    			add_location(input, file, 866, 4, 17927);
    			attr_dev(div0, "id", "mutListPlayers");
    			attr_dev(div0, "class", "mutListPlayers svelte-mmtspu");
    			add_location(div0, file, 867, 4, 18014);
    			attr_dev(button, "id", "mutListCloseButton");
    			attr_dev(button, "class", "button svelte-mmtspu");
    			add_location(button, file, 873, 5, 18239);
    			set_style(div1, "text-align", "center");
    			attr_dev(div1, "class", "svelte-mmtspu");
    			add_location(div1, file, 872, 4, 18200);
    			attr_dev(div2, "class", "mutlist svelte-mmtspu");
    			add_location(div2, file, 864, 3, 17859);
    			attr_dev(div3, "id", "floatwindow");
    			attr_dev(div3, "class", "svelte-mmtspu");
    			add_location(div3, file, 863, 2, 17833);
    			dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[19], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(div2, t1);
    			append_dev(div2, input);
    			append_dev(div2, t2);
    			append_dev(div2, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*mutList*/ 32) {
    				each_value_6 = /*mutList*/ ctx[5];
    				let i;

    				for (i = 0; i < each_value_6.length; i += 1) {
    					const child_ctx = get_each_context_6(ctx, each_value_6, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_6(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_6.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(863:1) {#if gui.mutList}",
    		ctx
    	});

    	return block;
    }

    // (869:5) {#each mutList as name,id}
    function create_each_block_6(ctx) {
    	let button;
    	let t_value = /*name*/ ctx[48] + "";
    	let t;
    	let button_id_value;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "id", button_id_value = "1" + /*id*/ ctx[42] + "Vf");
    			attr_dev(button, "class", "button selector mut-leaf svelte-mmtspu");
    			add_location(button, file, 869, 7, 18102);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(869:5) {#each mutList as name,id}",
    		ctx
    	});

    	return block;
    }

    // (879:1) {#if gui.roomSelectOpen}
    function create_if_block_7(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let p;
    	let t1;
    	let div0;
    	let ul;
    	let t2;
    	let div1;
    	let button;
    	let dispose;
    	let each_value_5 = /*config*/ ctx[0].room;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Выберите комнату";
    			t1 = space();
    			div0 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Закрыть";
    			attr_dev(p, "class", "leaf svelte-mmtspu");
    			add_location(p, file, 882, 24, 18516);
    			attr_dev(ul, "class", "ul svelte-mmtspu");
    			attr_dev(ul, "id", "roomSelectList");
    			add_location(ul, file, 884, 28, 18676);
    			attr_dev(div0, "id", "mutListPlayers");
    			attr_dev(div0, "class", "deviceListPlayers deviceSelectButton svelte-mmtspu");
    			add_location(div0, file, 883, 24, 18577);
    			attr_dev(button, "id", "roomSelectCloseButton");
    			attr_dev(button, "class", "button svelte-mmtspu");
    			add_location(button, file, 894, 28, 19184);
    			attr_dev(div1, "class", "deviceSelectCloseButton svelte-mmtspu");
    			add_location(div1, file, 893, 24, 19118);
    			attr_dev(div2, "class", "mutlist svelte-mmtspu");
    			add_location(div2, file, 881, 16, 18470);
    			attr_dev(div3, "id", "roomSelect");
    			attr_dev(div3, "class", "svelte-mmtspu");
    			add_location(div3, file, 880, 3, 18432);
    			attr_dev(div4, "id", "floatwindow");
    			attr_dev(div4, "class", "svelte-mmtspu");
    			add_location(div4, file, 879, 2, 18405);
    			dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[21], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				each_value_5 = /*config*/ ctx[0].room;
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_5(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_5.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(879:1) {#if gui.roomSelectOpen}",
    		ctx
    	});

    	return block;
    }

    // (886:8) {#each config.room as room,id}
    function create_each_block_5(ctx) {
    	let li;
    	let input;
    	let input_value_value;
    	let input_id_value;
    	let t0;
    	let label;
    	let div;
    	let t1_value = /*room*/ ctx[46] + "";
    	let t1;
    	let label_for_value;
    	let t2;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			div = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(input, "type", "radio");
    			input.__value = input_value_value = /*id*/ ctx[42];
    			input.value = input.__value;
    			attr_dev(input, "id", input_id_value = "radioRoom" + /*id*/ ctx[42]);
    			attr_dev(input, "name", "radioRoom");
    			attr_dev(input, "class", "inputDevice svelte-mmtspu");
    			/*$$binding_groups*/ ctx[17][2].push(input);
    			add_location(input, file, 887, 10, 18786);
    			attr_dev(div, "class", "button selectorDevice svelte-mmtspu");
    			add_location(div, file, 888, 37, 18942);
    			attr_dev(label, "for", label_for_value = "radioRoom" + /*id*/ ctx[42]);
    			attr_dev(label, "class", "svelte-mmtspu");
    			add_location(label, file, 888, 10, 18915);
    			attr_dev(li, "class", "li svelte-mmtspu");
    			add_location(li, file, 886, 9, 18760);
    			dispose = listen_dev(input, "change", /*input_change_handler_1*/ ctx[20]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, input);
    			input.checked = input.__value === /*config*/ ctx[0].selectRoom;
    			append_dev(li, t0);
    			append_dev(li, label);
    			append_dev(label, div);
    			append_dev(div, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				input.checked = input.__value === /*config*/ ctx[0].selectRoom;
    			}

    			if (dirty[0] & /*config*/ 1 && t1_value !== (t1_value = /*room*/ ctx[46] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			/*$$binding_groups*/ ctx[17][2].splice(/*$$binding_groups*/ ctx[17][2].indexOf(input), 1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(886:8) {#each config.room as room,id}",
    		ctx
    	});

    	return block;
    }

    // (901:1) {#if gui.channelSelectOpen}
    function create_if_block_6(ctx) {
    	let div8;
    	let div7;
    	let div6;
    	let p;
    	let t1;
    	let div4;
    	let ul;
    	let t2;
    	let li0;
    	let input0;
    	let t3;
    	let label0;
    	let div0;
    	let t5;
    	let li1;
    	let input1;
    	let label1;
    	let div1;
    	let li2;
    	let input2;
    	let label2;
    	let div2;
    	let li3;
    	let input3;
    	let label3;
    	let div3;
    	let t9;
    	let div5;
    	let button;
    	let dispose;
    	let each_value_4 = /*config*/ ctx[0].channel;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const block = {
    		c: function create() {
    			div8 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			p = element("p");
    			p.textContent = "Выберите канал";
    			t1 = space();
    			div4 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			li0 = element("li");
    			input0 = element("input");
    			t3 = space();
    			label0 = element("label");
    			div0 = element("div");
    			div0.textContent = "Channel1";
    			t5 = space();
    			li1 = element("li");
    			input1 = element("input");
    			label1 = element("label");
    			div1 = element("div");
    			div1.textContent = "Channel2";
    			li2 = element("li");
    			input2 = element("input");
    			label2 = element("label");
    			div2 = element("div");
    			div2.textContent = "Channel3";
    			li3 = element("li");
    			input3 = element("input");
    			label3 = element("label");
    			div3 = element("div");
    			div3.textContent = "Channel4";
    			t9 = space();
    			div5 = element("div");
    			button = element("button");
    			button.textContent = "Закрыть";
    			attr_dev(p, "class", "leaf svelte-mmtspu");
    			add_location(p, file, 904, 24, 19529);
    			attr_dev(input0, "type", "radio");
    			input0.value = "0";
    			attr_dev(input0, "id", "radioChannel0");
    			attr_dev(input0, "name", "radioChannel");
    			attr_dev(input0, "class", "inputDevice svelte-mmtspu");
    			add_location(input0, file, 914, 8, 20108);
    			attr_dev(div0, "class", "button selectorDevice svelte-mmtspu");
    			add_location(div0, file, 915, 35, 20233);
    			attr_dev(label0, "for", "radioChannel0");
    			attr_dev(label0, "class", "svelte-mmtspu");
    			add_location(label0, file, 915, 8, 20206);
    			attr_dev(li0, "class", "li svelte-mmtspu");
    			add_location(li0, file, 913, 28, 20084);
    			attr_dev(input1, "type", "radio");
    			input1.value = "1";
    			attr_dev(input1, "id", "radioChannel1");
    			attr_dev(input1, "name", "radioChannel");
    			attr_dev(input1, "class", "inputDevice svelte-mmtspu");
    			add_location(input1, file, 917, 22, 20326);
    			attr_dev(div1, "class", "button selectorDevice svelte-mmtspu");
    			add_location(div1, file, 917, 138, 20442);
    			attr_dev(label1, "for", "radioChannel1");
    			attr_dev(label1, "class", "svelte-mmtspu");
    			add_location(label1, file, 917, 111, 20415);
    			attr_dev(li1, "class", "li svelte-mmtspu");
    			add_location(li1, file, 917, 7, 20311);
    			attr_dev(input2, "type", "radio");
    			input2.value = "2";
    			attr_dev(input2, "id", "radioChannel2");
    			attr_dev(input2, "name", "radioChannel");
    			attr_dev(input2, "class", "inputDevice svelte-mmtspu");
    			add_location(input2, file, 917, 215, 20519);
    			attr_dev(div2, "class", "button selectorDevice svelte-mmtspu");
    			add_location(div2, file, 917, 331, 20635);
    			attr_dev(label2, "for", "radioChannel2");
    			attr_dev(label2, "class", "svelte-mmtspu");
    			add_location(label2, file, 917, 304, 20608);
    			attr_dev(li2, "class", "li svelte-mmtspu");
    			add_location(li2, file, 917, 200, 20504);
    			attr_dev(input3, "type", "radio");
    			input3.value = "3";
    			attr_dev(input3, "id", "radioChannel3");
    			attr_dev(input3, "name", "radioChannel");
    			attr_dev(input3, "class", "inputDevice svelte-mmtspu");
    			add_location(input3, file, 917, 408, 20712);
    			attr_dev(div3, "class", "button selectorDevice svelte-mmtspu");
    			add_location(div3, file, 917, 524, 20828);
    			attr_dev(label3, "for", "radioChannel3");
    			attr_dev(label3, "class", "svelte-mmtspu");
    			add_location(label3, file, 917, 497, 20801);
    			attr_dev(li3, "class", "li svelte-mmtspu");
    			add_location(li3, file, 917, 393, 20697);
    			attr_dev(ul, "class", "ul svelte-mmtspu");
    			attr_dev(ul, "id", "channelSelectList");
    			add_location(ul, file, 906, 28, 19687);
    			attr_dev(div4, "id", "mutListPlayers");
    			attr_dev(div4, "class", "deviceListPlayers deviceSelectButton svelte-mmtspu");
    			add_location(div4, file, 905, 24, 19588);
    			attr_dev(button, "id", "channelSelectCloseButton");
    			attr_dev(button, "class", "button svelte-mmtspu");
    			add_location(button, file, 921, 28, 21025);
    			attr_dev(div5, "class", "deviceSelectCloseButton svelte-mmtspu");
    			add_location(div5, file, 920, 24, 20959);
    			attr_dev(div6, "class", "mutlist svelte-mmtspu");
    			add_location(div6, file, 903, 16, 19483);
    			attr_dev(div7, "id", "channelSelect");
    			attr_dev(div7, "class", "svelte-mmtspu");
    			add_location(div7, file, 902, 3, 19442);
    			attr_dev(div8, "id", "floatwindow");
    			attr_dev(div8, "class", "svelte-mmtspu");
    			add_location(div8, file, 901, 2, 19415);
    			dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[23], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, p);
    			append_dev(div6, t1);
    			append_dev(div6, div4);
    			append_dev(div4, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(ul, t2);
    			append_dev(ul, li0);
    			append_dev(li0, input0);
    			append_dev(li0, t3);
    			append_dev(li0, label0);
    			append_dev(label0, div0);
    			append_dev(ul, t5);
    			append_dev(ul, li1);
    			append_dev(li1, input1);
    			append_dev(li1, label1);
    			append_dev(label1, div1);
    			append_dev(ul, li2);
    			append_dev(li2, input2);
    			append_dev(li2, label2);
    			append_dev(label2, div2);
    			append_dev(ul, li3);
    			append_dev(li3, input3);
    			append_dev(li3, label3);
    			append_dev(label3, div3);
    			append_dev(div6, t9);
    			append_dev(div6, div5);
    			append_dev(div5, button);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				each_value_4 = /*config*/ ctx[0].channel;
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, t2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_4.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div8);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(901:1) {#if gui.channelSelectOpen}",
    		ctx
    	});

    	return block;
    }

    // (908:7) {#each config.channel as channel,id}
    function create_each_block_4(ctx) {
    	let li;
    	let input;
    	let input_value_value;
    	let input_id_value;
    	let t0;
    	let label;
    	let div;
    	let t1_value = /*channel*/ ctx[52] + "";
    	let t1;
    	let label_for_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			div = element("div");
    			t1 = text(t1_value);
    			attr_dev(input, "type", "radio");
    			input.__value = input_value_value = /*id*/ ctx[42];
    			input.value = input.__value;
    			attr_dev(input, "id", input_id_value = "radioChanne" + /*id*/ ctx[42]);
    			attr_dev(input, "name", "radioChannel");
    			attr_dev(input, "class", "inputDevice svelte-mmtspu");
    			/*$$binding_groups*/ ctx[17][1].push(input);
    			add_location(input, file, 909, 9, 19803);
    			attr_dev(div, "class", "button selectorDevice svelte-mmtspu");
    			add_location(div, file, 910, 38, 19968);
    			attr_dev(label, "for", label_for_value = "radioChanne" + /*id*/ ctx[42]);
    			attr_dev(label, "class", "svelte-mmtspu");
    			add_location(label, file, 910, 9, 19939);
    			attr_dev(li, "class", "li svelte-mmtspu");
    			add_location(li, file, 908, 8, 19778);
    			dispose = listen_dev(input, "change", /*input_change_handler_2*/ ctx[22]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, input);
    			input.checked = input.__value === /*config*/ ctx[0].selectchannel;
    			append_dev(li, t0);
    			append_dev(li, label);
    			append_dev(label, div);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				input.checked = input.__value === /*config*/ ctx[0].selectchannel;
    			}

    			if (dirty[0] & /*config*/ 1 && t1_value !== (t1_value = /*channel*/ ctx[52] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			/*$$binding_groups*/ ctx[17][1].splice(/*$$binding_groups*/ ctx[17][1].indexOf(input), 1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(908:7) {#each config.channel as channel,id}",
    		ctx
    	});

    	return block;
    }

    // (928:1) {#if gui.volumeMainWindow}
    function create_if_block_4(ctx) {
    	let div;
    	let each_value_2 = /*volumeWindowRoom*/ ctx[6];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "volumeMainWindow svelte-mmtspu");
    			attr_dev(div, "id", "volumeMainWindow");
    			add_location(div, file, 928, 2, 21261);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowPlayer, volumeWindowRoom*/ 66) {
    				each_value_2 = /*volumeWindowRoom*/ ctx[6];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(928:1) {#if gui.volumeMainWindow}",
    		ctx
    	});

    	return block;
    }

    // (942:8) {#if room == id}
    function create_if_block_5(ctx) {
    	let tr;
    	let th0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let p0;
    	let t1_value = /*name*/ ctx[48] + "";
    	let t1;
    	let t2;
    	let th1;
    	let img1;
    	let img1_src_value;
    	let t3;
    	let p1;
    	let p1_id_value;
    	let t5;
    	let p2;
    	let t7;
    	let th2;
    	let img2;
    	let img2_src_value;
    	let t8;
    	let input;
    	let input_id_value;
    	let t9;
    	let p3;
    	let t10_value = /*value*/ ctx[49] + "";
    	let t10;
    	let p3_id_value;
    	let t11;
    	let dispose;

    	function input_change_input_handler() {
    		/*input_change_input_handler*/ ctx[24].call(input, /*value*/ ctx[49], /*each_value_3*/ ctx[50], /*each_index*/ ctx[51]);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			th0 = element("th");
    			img0 = element("img");
    			t0 = space();
    			p0 = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			th1 = element("th");
    			img1 = element("img");
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "1000";
    			t5 = space();
    			p2 = element("p");
    			p2.textContent = "m.";
    			t7 = space();
    			th2 = element("th");
    			img2 = element("img");
    			t8 = space();
    			input = element("input");
    			t9 = space();
    			p3 = element("p");
    			t10 = text(t10_value);
    			t11 = space();
    			if (img0.src !== (img0_src_value = "img/userloc.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "userloc svelte-mmtspu");
    			attr_dev(img0, "alt", "userloc");
    			add_location(img0, file, 944, 11, 21964);
    			attr_dev(p0, "class", "userName svelte-mmtspu");
    			add_location(p0, file, 945, 11, 22033);
    			attr_dev(th0, "class", "th svelte-mmtspu");
    			add_location(th0, file, 943, 10, 21937);
    			if (img1.src !== (img1_src_value = "img/distance.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "imgdistance svelte-mmtspu");
    			attr_dev(img1, "alt", "distance");
    			add_location(img1, file, 948, 11, 22117);
    			attr_dev(p1, "id", p1_id_value = "userName" + /*id*/ ctx[42] + "Distance");
    			attr_dev(p1, "class", "userName svelte-mmtspu");
    			add_location(p1, file, 949, 11, 22192);
    			attr_dev(p2, "class", "userName margin svelte-mmtspu");
    			add_location(p2, file, 950, 11, 22258);
    			attr_dev(th1, "class", "th svelte-mmtspu");
    			add_location(th1, file, 947, 10, 22090);
    			if (img2.src !== (img2_src_value = "img/micSettings.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "micSettings svelte-mmtspu");
    			attr_dev(img2, "alt", "micSettings");
    			add_location(img2, file, 953, 11, 22355);
    			attr_dev(input, "id", input_id_value = "sliderP" + /*id*/ ctx[42]);
    			attr_dev(input, "min", "0");
    			attr_dev(input, "max", "100");
    			attr_dev(input, "type", "range");
    			attr_dev(input, "class", "sliderP svelte-mmtspu");
    			set_style(input, "--columnsP", /*value*/ ctx[49] + "%");
    			add_location(input, file, 954, 11, 22436);
    			attr_dev(p3, "id", p3_id_value = "sliderP" + /*id*/ ctx[42] + "volume");
    			attr_dev(p3, "class", "userName svelte-mmtspu");
    			add_location(p3, file, 955, 11, 22571);
    			attr_dev(th2, "id", "grid");
    			attr_dev(th2, "class", "th svelte-mmtspu");
    			add_location(th2, file, 952, 10, 22318);
    			attr_dev(tr, "class", "voiceRoomPlayerSettings svelte-mmtspu");
    			add_location(tr, file, 942, 10, 21890);

    			dispose = [
    				listen_dev(input, "change", input_change_input_handler),
    				listen_dev(input, "input", input_change_input_handler)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, th0);
    			append_dev(th0, img0);
    			append_dev(th0, t0);
    			append_dev(th0, p0);
    			append_dev(p0, t1);
    			append_dev(tr, t2);
    			append_dev(tr, th1);
    			append_dev(th1, img1);
    			append_dev(th1, t3);
    			append_dev(th1, p1);
    			append_dev(th1, t5);
    			append_dev(th1, p2);
    			append_dev(tr, t7);
    			append_dev(tr, th2);
    			append_dev(th2, img2);
    			append_dev(th2, t8);
    			append_dev(th2, input);
    			set_input_value(input, /*value*/ ctx[49]);
    			append_dev(th2, t9);
    			append_dev(th2, p3);
    			append_dev(p3, t10);
    			append_dev(tr, t11);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*volumeWindowPlayer*/ 2 && t1_value !== (t1_value = /*name*/ ctx[48] + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*volumeWindowPlayer*/ 2) {
    				set_style(input, "--columnsP", /*value*/ ctx[49] + "%");
    			}

    			if (dirty[0] & /*volumeWindowPlayer*/ 2) {
    				set_input_value(input, /*value*/ ctx[49]);
    			}

    			if (dirty[0] & /*volumeWindowPlayer*/ 2 && t10_value !== (t10_value = /*value*/ ctx[49] + "")) set_data_dev(t10, t10_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(942:8) {#if room == id}",
    		ctx
    	});

    	return block;
    }

    // (941:8) {#each volumeWindowPlayer as {name, room, value}}
    function create_each_block_3(ctx) {
    	let if_block_anchor;
    	let if_block = /*room*/ ctx[46] == /*id*/ ctx[42] && create_if_block_5(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*room*/ ctx[46] == /*id*/ ctx[42]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_5(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(941:8) {#each volumeWindowPlayer as {name, room, value}}",
    		ctx
    	});

    	return block;
    }

    // (930:3) {#each volumeWindowRoom as room,id}
    function create_each_block_2(ctx) {
    	let div2;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let p;
    	let t1_value = /*room*/ ctx[46] + "";
    	let t1;
    	let t2;
    	let input;
    	let t3;
    	let label;
    	let t4;
    	let div1;
    	let table;
    	let tbody;
    	let t5;
    	let div2_id_value;
    	let each_value_3 = /*volumeWindowPlayer*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			label = element("label");
    			t4 = space();
    			div1 = element("div");
    			table = element("table");
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			attr_dev(img, "class", "radiomin svelte-mmtspu");
    			if (img.src !== (img_src_value = "img/radiomin.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "PicturaCka");
    			add_location(img, file, 932, 6, 21439);
    			attr_dev(p, "class", "voiceroomlogotext svelte-mmtspu");
    			add_location(p, file, 933, 6, 21508);
    			attr_dev(input, "id", "hiddenSetting");
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "svelte-mmtspu");
    			add_location(input, file, 934, 6, 21554);
    			attr_dev(label, "for", "hiddenSetting");
    			attr_dev(label, "class", "hiddenSetting svelte-mmtspu");
    			add_location(label, file, 935, 6, 21603);
    			attr_dev(div0, "class", "voiceroomlogo svelte-mmtspu");
    			add_location(div0, file, 931, 5, 21405);
    			attr_dev(tbody, "class", "svelte-mmtspu");
    			add_location(tbody, file, 939, 7, 21789);
    			attr_dev(table, "id", "voiceRoomPlayerSettings1");
    			attr_dev(table, "class", "svelte-mmtspu");
    			add_location(table, file, 938, 6, 21744);
    			attr_dev(div1, "id", "voiceRoom1PlayerList");
    			attr_dev(div1, "class", "voiceRoomPlayerList svelte-mmtspu");
    			add_location(div1, file, 937, 5, 21678);
    			attr_dev(div2, "id", div2_id_value = "voiceroom" + /*id*/ ctx[42]);
    			attr_dev(div2, "class", "voiceroom svelte-mmtspu");
    			add_location(div2, file, 930, 4, 21357);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div0, p);
    			append_dev(p, t1);
    			append_dev(div0, t2);
    			append_dev(div0, input);
    			append_dev(div0, t3);
    			append_dev(div0, label);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, table);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			append_dev(div2, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowPlayer*/ 2) {
    				each_value_3 = /*volumeWindowPlayer*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(930:3) {#each volumeWindowRoom as room,id}",
    		ctx
    	});

    	return block;
    }

    // (968:1) {#if gui.mainWindowOpen}
    function create_if_block_2(ctx) {
    	let div18;
    	let h1;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div6;
    	let div2;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let div1;
    	let p0;
    	let t3;
    	let div0;
    	let input0;
    	let t4;
    	let p1;
    	let t5_value = /*config*/ ctx[0].main.soundVolume + "";
    	let t5;
    	let t6;
    	let div5;
    	let img2;
    	let img2_src_value;
    	let t7;
    	let div4;
    	let p2;
    	let t9;
    	let div3;
    	let input1;
    	let t10;
    	let p3;
    	let t11_value = /*config*/ ctx[0].main.microphoneVolume + "";
    	let t11;
    	let t12;
    	let div8;
    	let p4;
    	let t14;
    	let div7;
    	let button0;
    	let t16;
    	let button1;
    	let t18;
    	let button2;
    	let t20;
    	let div11;
    	let div9;
    	let p5;
    	let t22;
    	let input2;
    	let t23;
    	let label0;
    	let t24;
    	let div10;
    	let p6;
    	let t26;
    	let input3;
    	let t27;
    	let label1;
    	let t28;
    	let div16;
    	let div13;
    	let div12;
    	let p7;
    	let t30;
    	let input4;
    	let t31;
    	let label2;
    	let t32;
    	let t33;
    	let div15;
    	let button3;
    	let t35;
    	let button4;
    	let t37;
    	let div14;
    	let p8;
    	let t39;
    	let table;
    	let tbody;
    	let tr0;
    	let th0;
    	let img3;
    	let img3_src_value;
    	let t40;
    	let th1;
    	let p9;
    	let t42;
    	let th2;
    	let button5;
    	let t43_value = /*selectButton*/ ctx[4].buttonkiGlobal + "";
    	let t43;
    	let button5_class_value;
    	let button5_disabled_value;
    	let t44;
    	let tr1;
    	let th3;
    	let img4;
    	let img4_src_value;
    	let t45;
    	let th4;
    	let p10;
    	let t47;
    	let th5;
    	let button6;
    	let t48_value = /*selectButton*/ ctx[4].buttonkiRadio + "";
    	let t48;
    	let button6_class_value;
    	let button6_disabled_value;
    	let t49;
    	let div17;
    	let button7;
    	let dispose;
    	let if_block = !/*config*/ ctx[0].main.inputmode && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			div18 = element("div");
    			h1 = element("h1");
    			img0 = element("img");
    			t0 = space();
    			div6 = element("div");
    			div2 = element("div");
    			img1 = element("img");
    			t1 = space();
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "Громкость звука";
    			t3 = space();
    			div0 = element("div");
    			input0 = element("input");
    			t4 = space();
    			p1 = element("p");
    			t5 = text(t5_value);
    			t6 = space();
    			div5 = element("div");
    			img2 = element("img");
    			t7 = space();
    			div4 = element("div");
    			p2 = element("p");
    			p2.textContent = "Громкость микрофона";
    			t9 = space();
    			div3 = element("div");
    			input1 = element("input");
    			t10 = space();
    			p3 = element("p");
    			t11 = text(t11_value);
    			t12 = space();
    			div8 = element("div");
    			p4 = element("p");
    			p4.textContent = "Устройство ввода:";
    			t14 = space();
    			div7 = element("div");
    			button0 = element("button");
    			button0.textContent = "Микрофон";
    			t16 = space();
    			button1 = element("button");
    			button1.textContent = "Мут лист";
    			t18 = space();
    			button2 = element("button");
    			button2.textContent = "Громкость игроков";
    			t20 = space();
    			div11 = element("div");
    			div9 = element("div");
    			p5 = element("p");
    			p5.textContent = "Включение звука";
    			t22 = space();
    			input2 = element("input");
    			t23 = space();
    			label0 = element("label");
    			t24 = space();
    			div10 = element("div");
    			p6 = element("p");
    			p6.textContent = "3D Звук";
    			t26 = space();
    			input3 = element("input");
    			t27 = space();
    			label1 = element("label");
    			t28 = space();
    			div16 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			p7 = element("p");
    			p7.textContent = "Режим ввода";
    			t30 = space();
    			input4 = element("input");
    			t31 = space();
    			label2 = element("label");
    			t32 = space();
    			if (if_block) if_block.c();
    			t33 = space();
    			div15 = element("div");
    			button3 = element("button");
    			button3.textContent = "Выбор чата";
    			t35 = space();
    			button4 = element("button");
    			button4.textContent = "Выбор канала";
    			t37 = space();
    			div14 = element("div");
    			p8 = element("p");
    			p8.textContent = "Назначение клавиш:";
    			t39 = space();
    			table = element("table");
    			tbody = element("tbody");
    			tr0 = element("tr");
    			th0 = element("th");
    			img3 = element("img");
    			t40 = space();
    			th1 = element("th");
    			p9 = element("p");
    			p9.textContent = "Говорить";
    			t42 = space();
    			th2 = element("th");
    			button5 = element("button");
    			t43 = text(t43_value);
    			t44 = space();
    			tr1 = element("tr");
    			th3 = element("th");
    			img4 = element("img");
    			t45 = space();
    			th4 = element("th");
    			p10 = element("p");
    			p10.textContent = "Говорить в рацию";
    			t47 = space();
    			th5 = element("th");
    			button6 = element("button");
    			t48 = text(t48_value);
    			t49 = space();
    			div17 = element("div");
    			button7 = element("button");
    			button7.textContent = "Закрыть";
    			attr_dev(img0, "class", "mainImg svelte-mmtspu");
    			if (img0.src !== (img0_src_value = "img/logo.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Logo");
    			add_location(img0, file, 969, 17, 22834);
    			attr_dev(h1, "id", "logo");
    			attr_dev(h1, "class", "svelte-mmtspu");
    			add_location(h1, file, 969, 3, 22820);
    			if (img1.src !== (img1_src_value = "img/headphones.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Headphones");
    			attr_dev(img1, "class", "inline-block headphones shadow svelte-mmtspu");
    			add_location(img1, file, 972, 5, 22943);
    			attr_dev(p0, "class", "volume svelte-mmtspu");
    			add_location(p0, file, 974, 6, 23080);
    			attr_dev(input0, "id", "range1");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "100");
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "class", "slider svelte-mmtspu");
    			set_style(input0, "--columns", /*config*/ ctx[0].main.soundVolume + "%");
    			add_location(input0, file, 976, 7, 23152);
    			attr_dev(p1, "class", "light inline-block svelte-mmtspu");
    			add_location(p1, file, 983, 7, 23360);
    			attr_dev(div0, "class", "volume svelte-mmtspu");
    			add_location(div0, file, 975, 6, 23124);
    			attr_dev(div1, "class", "inline-block soundvolume svelte-mmtspu");
    			add_location(div1, file, 973, 5, 23035);
    			attr_dev(div2, "class", "sound svelte-mmtspu");
    			add_location(div2, file, 971, 4, 22918);
    			if (img2.src !== (img2_src_value = "img/mic.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Mic");
    			attr_dev(img2, "class", "mic inline-block shadow svelte-mmtspu");
    			add_location(img2, file, 988, 5, 23485);
    			attr_dev(p2, "class", "volume svelte-mmtspu");
    			add_location(p2, file, 990, 5, 23600);
    			attr_dev(input1, "id", "range2");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "100");
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "class", "slider svelte-mmtspu");
    			set_style(input1, "--columns", /*config*/ ctx[0].main.microphoneVolume + "%");
    			add_location(input1, file, 992, 7, 23676);
    			attr_dev(p3, "class", "light inline-block svelte-mmtspu");
    			add_location(p3, file, 1000, 7, 23902);
    			attr_dev(div3, "class", "volume svelte-mmtspu");
    			add_location(div3, file, 991, 6, 23648);
    			attr_dev(div4, "class", "inline-block soundvolume svelte-mmtspu");
    			add_location(div4, file, 989, 5, 23556);
    			attr_dev(div5, "class", "sound svelte-mmtspu");
    			add_location(div5, file, 987, 4, 23460);
    			attr_dev(div6, "id", "boxvoice");
    			attr_dev(div6, "class", "svelte-mmtspu");
    			add_location(div6, file, 970, 3, 22894);
    			attr_dev(p4, "class", "regular svelte-mmtspu");
    			add_location(p4, file, 1006, 4, 24044);
    			attr_dev(button0, "class", "input-text deviceSelectOpen svelte-mmtspu");
    			attr_dev(button0, "id", "deviceSelectOpenButton");
    			add_location(button0, file, 1008, 5, 24100);
    			attr_dev(button1, "class", "button mut shadow svelte-mmtspu");
    			attr_dev(button1, "id", "mutListOpenButton");
    			add_location(button1, file, 1009, 5, 24240);
    			attr_dev(button2, "class", "button mut shadow svelte-mmtspu");
    			attr_dev(button2, "id", "volumePlayersButton");
    			add_location(button2, file, 1010, 5, 24356);
    			attr_dev(div7, "class", "svelte-mmtspu");
    			add_location(div7, file, 1007, 4, 24089);
    			attr_dev(div8, "class", "boxdevice svelte-mmtspu");
    			add_location(div8, file, 1005, 3, 24016);
    			attr_dev(p5, "class", "svelte-mmtspu");
    			add_location(p5, file, 1015, 5, 24577);
    			attr_dev(input2, "id", "triggerOnOffSound");
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "svelte-mmtspu");
    			add_location(input2, file, 1016, 5, 24605);
    			attr_dev(label0, "for", "triggerOnOffSound");
    			attr_dev(label0, "class", "checker onoff-sound svelte-mmtspu");
    			add_location(label0, file, 1017, 5, 24702);
    			attr_dev(div9, "class", "alignment svelte-mmtspu");
    			add_location(div9, file, 1014, 4, 24548);
    			attr_dev(p6, "class", "svelte-mmtspu");
    			add_location(p6, file, 1020, 5, 24822);
    			attr_dev(input3, "id", "triggerSound3D");
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "svelte-mmtspu");
    			add_location(input3, file, 1021, 5, 24842);
    			attr_dev(label1, "for", "triggerSound3D");
    			attr_dev(label1, "class", "checker checker-sound3D svelte-mmtspu");
    			add_location(label1, file, 1022, 5, 24933);
    			attr_dev(div10, "class", "sound3D alignment svelte-mmtspu");
    			add_location(div10, file, 1019, 4, 24785);
    			attr_dev(div11, "class", "boxmodes alignment svelte-mmtspu");
    			add_location(div11, file, 1013, 3, 24511);
    			attr_dev(p7, "class", "white svelte-mmtspu");
    			add_location(p7, file, 1028, 6, 25137);
    			attr_dev(input4, "id", "triggerInputMode");
    			attr_dev(input4, "type", "checkbox");
    			attr_dev(input4, "class", "svelte-mmtspu");
    			add_location(input4, file, 1029, 6, 25176);
    			attr_dev(label2, "for", "triggerInputMode");
    			attr_dev(label2, "class", "checker input-mode svelte-mmtspu");
    			add_location(label2, file, 1030, 6, 25265);
    			attr_dev(div12, "class", "margin-bottom alignment svelte-mmtspu");
    			add_location(div12, file, 1027, 5, 25093);
    			attr_dev(div13, "class", "upinputmode svelte-mmtspu");
    			add_location(div13, file, 1026, 4, 25062);
    			attr_dev(button3, "class", "input-text channelSelectOpen svelte-mmtspu");
    			attr_dev(button3, "id", "roomSelectOpenButton");
    			add_location(button3, file, 1052, 5, 26261);
    			attr_dev(button4, "class", "input-text channelSelectOpen svelte-mmtspu");
    			attr_dev(button4, "id", "channelSelectOpenButton");
    			add_location(button4, file, 1053, 5, 26400);
    			attr_dev(p8, "class", "white svelte-mmtspu");
    			add_location(p8, file, 1055, 6, 26580);
    			attr_dev(div14, "class", "alignmentKey svelte-mmtspu");
    			add_location(div14, file, 1054, 5, 26547);
    			if (img3.src !== (img3_src_value = "img/minmik.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "minMic svelte-mmtspu");
    			attr_dev(img3, "alt", "minMic");
    			add_location(img3, file, 1060, 12, 26713);
    			attr_dev(th0, "class", "svelte-mmtspu");
    			add_location(th0, file, 1060, 8, 26709);
    			attr_dev(p9, "class", "button-selection svelte-mmtspu");
    			add_location(p9, file, 1061, 12, 26785);
    			attr_dev(th1, "class", "svelte-mmtspu");
    			add_location(th1, file, 1061, 8, 26781);
    			attr_dev(button5, "class", button5_class_value = "inputbutton input-text " + (/*selectButton*/ ctx[4].kiGlobal ? "bactive" : "") + " svelte-mmtspu");
    			attr_dev(button5, "id", "kiGlobal");
    			button5.disabled = button5_disabled_value = /*selectButton*/ ctx[4].kiRadio;
    			add_location(button5, file, 1062, 12, 26843);
    			attr_dev(th2, "class", "svelte-mmtspu");
    			add_location(th2, file, 1062, 8, 26839);
    			attr_dev(tr0, "class", "svelte-mmtspu");
    			add_location(tr0, file, 1059, 7, 26696);
    			if (img4.src !== (img4_src_value = "img/radio.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "minradio svelte-mmtspu");
    			attr_dev(img4, "alt", "minradio");
    			add_location(img4, file, 1070, 12, 27143);
    			attr_dev(th3, "class", "svelte-mmtspu");
    			add_location(th3, file, 1070, 8, 27139);
    			attr_dev(p10, "class", "button-selection svelte-mmtspu");
    			add_location(p10, file, 1071, 12, 27218);
    			attr_dev(th4, "class", "svelte-mmtspu");
    			add_location(th4, file, 1071, 8, 27214);
    			attr_dev(button6, "class", button6_class_value = "inputbutton input-text " + (/*selectButton*/ ctx[4].kiRadio ? "bactive" : "") + " svelte-mmtspu");
    			attr_dev(button6, "id", "kiRadio");
    			button6.disabled = button6_disabled_value = /*selectButton*/ ctx[4].kiGlobal;
    			add_location(button6, file, 1072, 12, 27284);
    			attr_dev(th5, "class", "svelte-mmtspu");
    			add_location(th5, file, 1072, 8, 27280);
    			attr_dev(tr1, "class", "svelte-mmtspu");
    			add_location(tr1, file, 1069, 7, 27126);
    			attr_dev(tbody, "class", "svelte-mmtspu");
    			add_location(tbody, file, 1058, 6, 26681);
    			attr_dev(table, "class", "keyname-space-between svelte-mmtspu");
    			add_location(table, file, 1057, 5, 26637);
    			attr_dev(div15, "class", "inline-block margin svelte-mmtspu");
    			add_location(div15, file, 1051, 4, 26222);
    			attr_dev(div16, "class", "boxmodes box-flex svelte-mmtspu");
    			add_location(div16, file, 1025, 3, 25026);
    			attr_dev(button7, "class", "button shadow closebuttonwidth svelte-mmtspu");
    			add_location(button7, file, 1084, 4, 27642);
    			attr_dev(div17, "class", "boxmodes end svelte-mmtspu");
    			add_location(div17, file, 1083, 3, 27611);
    			attr_dev(div18, "id", "container");
    			attr_dev(div18, "class", "svelte-mmtspu");
    			add_location(div18, file, 968, 2, 22796);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[25]),
    				listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[25]),
    				listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[26]),
    				listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[26]),
    				listen_dev(button0, "click", /*click_handler_4*/ ctx[27], false, false, false),
    				listen_dev(button1, "click", /*click_handler_5*/ ctx[28], false, false, false),
    				listen_dev(button2, "click", /*click_handler_6*/ ctx[29], false, false, false),
    				listen_dev(input2, "change", /*input2_change_handler*/ ctx[30]),
    				listen_dev(input3, "change", /*input3_change_handler*/ ctx[31]),
    				listen_dev(input4, "change", /*input4_change_handler*/ ctx[32]),
    				listen_dev(button3, "click", /*click_handler_7*/ ctx[36], false, false, false),
    				listen_dev(button4, "click", /*click_handler_8*/ ctx[37], false, false, false),
    				listen_dev(button5, "click", /*click_handler_9*/ ctx[38], false, false, false),
    				listen_dev(button6, "click", /*click_handler_10*/ ctx[39], false, false, false),
    				listen_dev(button7, "click", /*closeMainWindow*/ ctx[8], false, false, false)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div18, anchor);
    			append_dev(div18, h1);
    			append_dev(h1, img0);
    			append_dev(div18, t0);
    			append_dev(div18, div6);
    			append_dev(div6, div2);
    			append_dev(div2, img1);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, p0);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*config*/ ctx[0].main.soundVolume);
    			append_dev(div0, t4);
    			append_dev(div0, p1);
    			append_dev(p1, t5);
    			append_dev(div6, t6);
    			append_dev(div6, div5);
    			append_dev(div5, img2);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, p2);
    			append_dev(div4, t9);
    			append_dev(div4, div3);
    			append_dev(div3, input1);
    			set_input_value(input1, /*config*/ ctx[0].main.microphoneVolume);
    			append_dev(div3, t10);
    			append_dev(div3, p3);
    			append_dev(p3, t11);
    			append_dev(div18, t12);
    			append_dev(div18, div8);
    			append_dev(div8, p4);
    			append_dev(div8, t14);
    			append_dev(div8, div7);
    			append_dev(div7, button0);
    			append_dev(div7, t16);
    			append_dev(div7, button1);
    			append_dev(div7, t18);
    			append_dev(div7, button2);
    			append_dev(div18, t20);
    			append_dev(div18, div11);
    			append_dev(div11, div9);
    			append_dev(div9, p5);
    			append_dev(div9, t22);
    			append_dev(div9, input2);
    			input2.checked = /*config*/ ctx[0].main.triggerOnOffSound;
    			append_dev(div9, t23);
    			append_dev(div9, label0);
    			append_dev(div11, t24);
    			append_dev(div11, div10);
    			append_dev(div10, p6);
    			append_dev(div10, t26);
    			append_dev(div10, input3);
    			input3.checked = /*config*/ ctx[0].main.triggerSound3D;
    			append_dev(div10, t27);
    			append_dev(div10, label1);
    			append_dev(div18, t28);
    			append_dev(div18, div16);
    			append_dev(div16, div13);
    			append_dev(div13, div12);
    			append_dev(div12, p7);
    			append_dev(div12, t30);
    			append_dev(div12, input4);
    			input4.checked = /*config*/ ctx[0].main.inputmode;
    			append_dev(div12, t31);
    			append_dev(div12, label2);
    			append_dev(div13, t32);
    			if (if_block) if_block.m(div13, null);
    			append_dev(div16, t33);
    			append_dev(div16, div15);
    			append_dev(div15, button3);
    			append_dev(div15, t35);
    			append_dev(div15, button4);
    			append_dev(div15, t37);
    			append_dev(div15, div14);
    			append_dev(div14, p8);
    			append_dev(div15, t39);
    			append_dev(div15, table);
    			append_dev(table, tbody);
    			append_dev(tbody, tr0);
    			append_dev(tr0, th0);
    			append_dev(th0, img3);
    			append_dev(tr0, t40);
    			append_dev(tr0, th1);
    			append_dev(th1, p9);
    			append_dev(tr0, t42);
    			append_dev(tr0, th2);
    			append_dev(th2, button5);
    			append_dev(button5, t43);
    			append_dev(tbody, t44);
    			append_dev(tbody, tr1);
    			append_dev(tr1, th3);
    			append_dev(th3, img4);
    			append_dev(tr1, t45);
    			append_dev(tr1, th4);
    			append_dev(th4, p10);
    			append_dev(tr1, t47);
    			append_dev(tr1, th5);
    			append_dev(th5, button6);
    			append_dev(button6, t48);
    			append_dev(div18, t49);
    			append_dev(div18, div17);
    			append_dev(div17, button7);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				set_style(input0, "--columns", /*config*/ ctx[0].main.soundVolume + "%");
    			}

    			if (dirty[0] & /*config*/ 1) {
    				set_input_value(input0, /*config*/ ctx[0].main.soundVolume);
    			}

    			if (dirty[0] & /*config*/ 1 && t5_value !== (t5_value = /*config*/ ctx[0].main.soundVolume + "")) set_data_dev(t5, t5_value);

    			if (dirty[0] & /*config*/ 1) {
    				set_style(input1, "--columns", /*config*/ ctx[0].main.microphoneVolume + "%");
    			}

    			if (dirty[0] & /*config*/ 1) {
    				set_input_value(input1, /*config*/ ctx[0].main.microphoneVolume);
    			}

    			if (dirty[0] & /*config*/ 1 && t11_value !== (t11_value = /*config*/ ctx[0].main.microphoneVolume + "")) set_data_dev(t11, t11_value);

    			if (dirty[0] & /*config*/ 1) {
    				input2.checked = /*config*/ ctx[0].main.triggerOnOffSound;
    			}

    			if (dirty[0] & /*config*/ 1) {
    				input3.checked = /*config*/ ctx[0].main.triggerSound3D;
    			}

    			if (dirty[0] & /*config*/ 1) {
    				input4.checked = /*config*/ ctx[0].main.inputmode;
    			}

    			if (!/*config*/ ctx[0].main.inputmode) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(div13, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*selectButton*/ 16 && t43_value !== (t43_value = /*selectButton*/ ctx[4].buttonkiGlobal + "")) set_data_dev(t43, t43_value);

    			if (dirty[0] & /*selectButton*/ 16 && button5_class_value !== (button5_class_value = "inputbutton input-text " + (/*selectButton*/ ctx[4].kiGlobal ? "bactive" : "") + " svelte-mmtspu")) {
    				attr_dev(button5, "class", button5_class_value);
    			}

    			if (dirty[0] & /*selectButton*/ 16 && button5_disabled_value !== (button5_disabled_value = /*selectButton*/ ctx[4].kiRadio)) {
    				prop_dev(button5, "disabled", button5_disabled_value);
    			}

    			if (dirty[0] & /*selectButton*/ 16 && t48_value !== (t48_value = /*selectButton*/ ctx[4].buttonkiRadio + "")) set_data_dev(t48, t48_value);

    			if (dirty[0] & /*selectButton*/ 16 && button6_class_value !== (button6_class_value = "inputbutton input-text " + (/*selectButton*/ ctx[4].kiRadio ? "bactive" : "") + " svelte-mmtspu")) {
    				attr_dev(button6, "class", button6_class_value);
    			}

    			if (dirty[0] & /*selectButton*/ 16 && button6_disabled_value !== (button6_disabled_value = /*selectButton*/ ctx[4].kiGlobal)) {
    				prop_dev(button6, "disabled", button6_disabled_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div18);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(968:1) {#if gui.mainWindowOpen}",
    		ctx
    	});

    	return block;
    }

    // (1033:5) {#if !config.main.inputmode}
    function create_if_block_3(ctx) {
    	let div3;
    	let ul;
    	let li0;
    	let input0;
    	let input0_value_value;
    	let t0;
    	let label0;
    	let div0;
    	let t2;
    	let li1;
    	let input1;
    	let input1_value_value;
    	let t3;
    	let label1;
    	let div1;
    	let t5;
    	let li2;
    	let input2;
    	let input2_value_value;
    	let t6;
    	let label2;
    	let div2;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			input0 = element("input");
    			t0 = space();
    			label0 = element("label");
    			div0 = element("div");
    			div0.textContent = "По голосу";
    			t2 = space();
    			li1 = element("li");
    			input1 = element("input");
    			t3 = space();
    			label1 = element("label");
    			div1 = element("div");
    			div1.textContent = "При удердании";
    			t5 = space();
    			li2 = element("li");
    			input2 = element("input");
    			t6 = space();
    			label2 = element("label");
    			div2 = element("div");
    			div2.textContent = "Переключение по клавише";
    			attr_dev(input0, "type", "radio");
    			input0.__value = input0_value_value = 1;
    			input0.value = input0.__value;
    			attr_dev(input0, "id", "radio1");
    			attr_dev(input0, "name", "radio");
    			attr_dev(input0, "class", "input svelte-mmtspu");
    			/*$$binding_groups*/ ctx[17][0].push(input0);
    			add_location(input0, file, 1036, 8, 25474);
    			attr_dev(div0, "class", "button selector A svelte-mmtspu");
    			add_location(div0, file, 1037, 28, 25612);
    			attr_dev(label0, "for", "radio1");
    			attr_dev(label0, "class", "svelte-mmtspu");
    			add_location(label0, file, 1037, 8, 25592);
    			attr_dev(li0, "class", "li svelte-mmtspu");
    			add_location(li0, file, 1035, 7, 25450);
    			attr_dev(input1, "type", "radio");
    			input1.__value = input1_value_value = 2;
    			input1.value = input1.__value;
    			attr_dev(input1, "id", "radio2");
    			attr_dev(input1, "name", "radio");
    			attr_dev(input1, "class", "input svelte-mmtspu");
    			/*$$binding_groups*/ ctx[17][0].push(input1);
    			add_location(input1, file, 1040, 8, 25711);
    			attr_dev(div1, "class", "button selector A svelte-mmtspu");
    			add_location(div1, file, 1041, 28, 25849);
    			attr_dev(label1, "for", "radio2");
    			attr_dev(label1, "class", "svelte-mmtspu");
    			add_location(label1, file, 1041, 8, 25829);
    			attr_dev(li1, "class", "li svelte-mmtspu");
    			add_location(li1, file, 1039, 7, 25687);
    			attr_dev(input2, "type", "radio");
    			input2.__value = input2_value_value = 3;
    			input2.value = input2.__value;
    			attr_dev(input2, "id", "radio3");
    			attr_dev(input2, "name", "radio");
    			attr_dev(input2, "class", "input svelte-mmtspu");
    			/*$$binding_groups*/ ctx[17][0].push(input2);
    			add_location(input2, file, 1044, 8, 25952);
    			attr_dev(div2, "class", "button selector A svelte-mmtspu");
    			add_location(div2, file, 1045, 28, 26090);
    			attr_dev(label2, "for", "radio3");
    			attr_dev(label2, "class", "svelte-mmtspu");
    			add_location(label2, file, 1045, 8, 26070);
    			attr_dev(li2, "class", "li svelte-mmtspu");
    			add_location(li2, file, 1043, 7, 25928);
    			attr_dev(ul, "class", "ul svelte-mmtspu");
    			add_location(ul, file, 1034, 6, 25427);
    			attr_dev(div3, "id", "inputmode");
    			attr_dev(div3, "class", "inputmode svelte-mmtspu");
    			add_location(div3, file, 1033, 5, 25382);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_handler*/ ctx[33]),
    				listen_dev(input1, "change", /*input1_change_handler*/ ctx[34]),
    				listen_dev(input2, "change", /*input2_change_handler_1*/ ctx[35])
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, ul);
    			append_dev(ul, li0);
    			append_dev(li0, input0);
    			input0.checked = input0.__value === /*config*/ ctx[0].main.inputModeRadio;
    			append_dev(li0, t0);
    			append_dev(li0, label0);
    			append_dev(label0, div0);
    			append_dev(ul, t2);
    			append_dev(ul, li1);
    			append_dev(li1, input1);
    			input1.checked = input1.__value === /*config*/ ctx[0].main.inputModeRadio;
    			append_dev(li1, t3);
    			append_dev(li1, label1);
    			append_dev(label1, div1);
    			append_dev(ul, t5);
    			append_dev(ul, li2);
    			append_dev(li2, input2);
    			input2.checked = input2.__value === /*config*/ ctx[0].main.inputModeRadio;
    			append_dev(li2, t6);
    			append_dev(li2, label2);
    			append_dev(label2, div2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				input0.checked = input0.__value === /*config*/ ctx[0].main.inputModeRadio;
    			}

    			if (dirty[0] & /*config*/ 1) {
    				input1.checked = input1.__value === /*config*/ ctx[0].main.inputModeRadio;
    			}

    			if (dirty[0] & /*config*/ 1) {
    				input2.checked = input2.__value === /*config*/ ctx[0].main.inputModeRadio;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			/*$$binding_groups*/ ctx[17][0].splice(/*$$binding_groups*/ ctx[17][0].indexOf(input0), 1);
    			/*$$binding_groups*/ ctx[17][0].splice(/*$$binding_groups*/ ctx[17][0].indexOf(input1), 1);
    			/*$$binding_groups*/ ctx[17][0].splice(/*$$binding_groups*/ ctx[17][0].indexOf(input2), 1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(1033:5) {#if !config.main.inputmode}",
    		ctx
    	});

    	return block;
    }

    // (1103:6) {#if players.room == id && players.talk}
    function create_if_block(ctx) {
    	let tr;
    	let th0;
    	let img;
    	let img_src_value;
    	let t0;
    	let th1;
    	let p0;
    	let t1_value = /*players*/ ctx[43].name + "";
    	let t1;
    	let t2;
    	let th2;
    	let p1;
    	let t3;

    	function select_block_type(ctx, dirty) {
    		if (/*players*/ ctx[43].text != undefined) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			th0 = element("th");
    			img = element("img");
    			t0 = space();
    			th1 = element("th");
    			p0 = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			th2 = element("th");
    			p1 = element("p");
    			if_block.c();
    			t3 = space();
    			attr_dev(img, "class", "owerlayRadiominImg ower svelte-mmtspu");
    			if (img.src !== (img_src_value = "img/owerlayVolume.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "owerlayRadiomin");
    			add_location(img, file, 1104, 12, 28316);
    			attr_dev(th0, "class", "svelte-mmtspu");
    			add_location(th0, file, 1104, 8, 28312);
    			attr_dev(p0, "class", "owerlayPlayer ower svelte-mmtspu");
    			attr_dev(p0, "id", "owerlayPlayer");
    			add_location(p0, file, 1105, 12, 28421);
    			attr_dev(th1, "class", "svelte-mmtspu");
    			add_location(th1, file, 1105, 8, 28417);
    			attr_dev(p1, "class", "owerlayPlayerDistance ower svelte-mmtspu");
    			attr_dev(p1, "id", "owerlayPlayerDistance");
    			add_location(p1, file, 1106, 12, 28506);
    			attr_dev(th2, "class", "svelte-mmtspu");
    			add_location(th2, file, 1106, 8, 28502);
    			attr_dev(tr, "class", "svelte-mmtspu");
    			add_location(tr, file, 1103, 7, 28299);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, th0);
    			append_dev(th0, img);
    			append_dev(tr, t0);
    			append_dev(tr, th1);
    			append_dev(th1, p0);
    			append_dev(p0, t1);
    			append_dev(tr, t2);
    			append_dev(tr, th2);
    			append_dev(th2, p1);
    			if_block.m(p1, null);
    			append_dev(tr, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowPlayer*/ 2 && t1_value !== (t1_value = /*players*/ ctx[43].name + "")) set_data_dev(t1, t1_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(p1, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(1103:6) {#if players.room == id && players.talk}",
    		ctx
    	});

    	return block;
    }

    // (1110:8) {:else}
    function create_else_block(ctx) {
    	let t_value = /*players*/ ctx[43].distance + "m." + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowPlayer*/ 2 && t_value !== (t_value = /*players*/ ctx[43].distance + "m." + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(1110:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1108:8) {#if players.text != undefined}
    function create_if_block_1(ctx) {
    	let t_value = /*players*/ ctx[43].text + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowPlayer*/ 2 && t_value !== (t_value = /*players*/ ctx[43].text + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(1108:8) {#if players.text != undefined}",
    		ctx
    	});

    	return block;
    }

    // (1102:5) {#each volumeWindowPlayer as players}
    function create_each_block_1(ctx) {
    	let if_block_anchor;
    	let if_block = /*players*/ ctx[43].room == /*id*/ ctx[42] && /*players*/ ctx[43].talk && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*players*/ ctx[43].room == /*id*/ ctx[42] && /*players*/ ctx[43].talk) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(1102:5) {#each volumeWindowPlayer as players}",
    		ctx
    	});

    	return block;
    }

    // (1093:2) {#each volumeWindowRoom as voiceRoom,id}
    function create_each_block(ctx) {
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let img;
    	let img_src_value;
    	let t0;
    	let th1;
    	let p;
    	let t1_value = /*voiceRoom*/ ctx[40] + "";
    	let t1;
    	let t2;
    	let tbody;
    	let t3;
    	let each_value_1 = /*volumeWindowPlayer*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			img = element("img");
    			t0 = space();
    			th1 = element("th");
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			attr_dev(img, "class", "owerlayRadiomin ower svelte-mmtspu");
    			if (img.src !== (img_src_value = "img/radiomin.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "owerlayRadiomin");
    			add_location(img, file, 1096, 10, 27997);
    			attr_dev(th0, "class", "svelte-mmtspu");
    			add_location(th0, file, 1096, 6, 27993);
    			attr_dev(p, "class", "owerlayRoomName ower svelte-mmtspu");
    			attr_dev(p, "id", "owerlayRoomName");
    			add_location(p, file, 1097, 10, 28092);
    			attr_dev(th1, "class", "svelte-mmtspu");
    			add_location(th1, file, 1097, 6, 28088);
    			attr_dev(tr, "class", "svelte-mmtspu");
    			add_location(tr, file, 1095, 5, 27982);
    			attr_dev(thead, "class", "svelte-mmtspu");
    			add_location(thead, file, 1094, 4, 27969);
    			attr_dev(tbody, "class", "svelte-mmtspu");
    			add_location(tbody, file, 1100, 4, 28194);
    			attr_dev(table, "class", "svelte-mmtspu");
    			add_location(table, file, 1093, 3, 27957);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(th0, img);
    			append_dev(tr, t0);
    			append_dev(tr, th1);
    			append_dev(th1, p);
    			append_dev(p, t1);
    			append_dev(table, t2);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			append_dev(table, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowPlayer*/ 2) {
    				each_value_1 = /*volumeWindowPlayer*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(1093:2) {#each volumeWindowRoom as voiceRoom,id}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div1;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let div0;
    	let t6;
    	let img0;
    	let img0_src_value;
    	let t7;
    	let img1;
    	let img1_src_value;
    	let dispose;
    	let if_block0 = /*gui*/ ctx[2].deviceSelectOpen && create_if_block_9(ctx);
    	let if_block1 = /*gui*/ ctx[2].mutList && create_if_block_8(ctx);
    	let if_block2 = /*gui*/ ctx[2].roomSelectOpen && create_if_block_7(ctx);
    	let if_block3 = /*gui*/ ctx[2].channelSelectOpen && create_if_block_6(ctx);
    	let if_block4 = /*gui*/ ctx[2].volumeMainWindow && create_if_block_4(ctx);
    	let if_block5 = /*gui*/ ctx[2].mainWindowOpen && create_if_block_2(ctx);
    	let each_value = /*volumeWindowRoom*/ ctx[6];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			t3 = space();
    			if (if_block4) if_block4.c();
    			t4 = space();
    			if (if_block5) if_block5.c();
    			t5 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			img0 = element("img");
    			t7 = space();
    			img1 = element("img");
    			attr_dev(div0, "id", "owerlay");
    			attr_dev(div0, "class", "owerlay ower svelte-mmtspu");
    			set_style(div0, "--left", /*move*/ ctx[3].owerlay.left + "px");
    			set_style(div0, "--top", /*move*/ ctx[3].owerlay.top + "px");
    			set_style(div0, "background-color", /*move*/ ctx[3].background);
    			add_location(div0, file, 1088, 1, 27760);
    			attr_dev(img0, "draggable", "false");
    			attr_dev(img0, "class", "owerlayMicrophone svelte-mmtspu");
    			attr_dev(img0, "id", "owerlayMicrophone");
    			if (img0.src !== (img0_src_value = "img/owerlayMicrophone.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "owerlayMicrophone");
    			set_style(img0, "--left", /*move*/ ctx[3].owerlayMicrophone.left + "px");
    			set_style(img0, "--top", /*move*/ ctx[3].owerlayMicrophone.top + "px");
    			add_location(img0, file, 1120, 1, 28799);
    			attr_dev(img1, "draggable", "false");
    			attr_dev(img1, "class", "owerlayVolumeOn svelte-mmtspu");
    			attr_dev(img1, "id", "owerlayVolumeOn");
    			if (img1.src !== (img1_src_value = "img/owerlayVolumeOn.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "owerlayVolumeOn");
    			set_style(img1, "--left", /*move*/ ctx[3].owerlayVolumeOn.left + "px");
    			set_style(img1, "--top", /*move*/ ctx[3].owerlayVolumeOn.top + "px");
    			add_location(img1, file, 1127, 1, 29032);
    			attr_dev(div1, "id", "mainWindow");
    			set_style(div1, "background-image", "url(img/dsfghdfshsdg.png)");
    			attr_dev(div1, "oncontextmenu", "return false");
    			attr_dev(div1, "class", "svelte-mmtspu");
    			add_location(div1, file, 841, 0, 16927);

    			dispose = [
    				listen_dev(window, "mousemove", /*mousemove_handler*/ ctx[14], false, false, false),
    				listen_dev(window, "mousedown", /*mousedown_handler*/ ctx[15], false, false, false),
    				listen_dev(window, "mouseup", /*stopMove*/ ctx[11], false, false, false),
    				listen_dev(window, "keydown", /*keydown*/ ctx[7], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t0);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t1);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(div1, t2);
    			if (if_block3) if_block3.m(div1, null);
    			append_dev(div1, t3);
    			if (if_block4) if_block4.m(div1, null);
    			append_dev(div1, t4);
    			if (if_block5) if_block5.m(div1, null);
    			append_dev(div1, t5);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div1, t6);
    			append_dev(div1, img0);
    			append_dev(div1, t7);
    			append_dev(div1, img1);
    		},
    		p: function update(ctx, dirty) {
    			if (/*gui*/ ctx[2].deviceSelectOpen) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_9(ctx);
    					if_block0.c();
    					if_block0.m(div1, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*gui*/ ctx[2].mutList) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_8(ctx);
    					if_block1.c();
    					if_block1.m(div1, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*gui*/ ctx[2].roomSelectOpen) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_7(ctx);
    					if_block2.c();
    					if_block2.m(div1, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*gui*/ ctx[2].channelSelectOpen) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_6(ctx);
    					if_block3.c();
    					if_block3.m(div1, t3);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*gui*/ ctx[2].volumeMainWindow) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_4(ctx);
    					if_block4.c();
    					if_block4.m(div1, t4);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*gui*/ ctx[2].mainWindowOpen) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_2(ctx);
    					if_block5.c();
    					if_block5.m(div1, t5);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (dirty[0] & /*volumeWindowPlayer, volumeWindowRoom*/ 66) {
    				each_value = /*volumeWindowRoom*/ ctx[6];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*move*/ 8) {
    				set_style(div0, "--left", /*move*/ ctx[3].owerlay.left + "px");
    			}

    			if (dirty[0] & /*move*/ 8) {
    				set_style(div0, "--top", /*move*/ ctx[3].owerlay.top + "px");
    			}

    			if (dirty[0] & /*move*/ 8) {
    				set_style(div0, "background-color", /*move*/ ctx[3].background);
    			}

    			if (dirty[0] & /*move*/ 8) {
    				set_style(img0, "--left", /*move*/ ctx[3].owerlayMicrophone.left + "px");
    			}

    			if (dirty[0] & /*move*/ 8) {
    				set_style(img0, "--top", /*move*/ ctx[3].owerlayMicrophone.top + "px");
    			}

    			if (dirty[0] & /*move*/ 8) {
    				set_style(img1, "--left", /*move*/ ctx[3].owerlayVolumeOn.left + "px");
    			}

    			if (dirty[0] & /*move*/ 8) {
    				set_style(img1, "--top", /*move*/ ctx[3].owerlayVolumeOn.top + "px");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const config = {
    		main: {
    			soundVolume: 50,
    			microphoneVolume: 50,
    			triggerOnOffSound: true,
    			triggerSound3D: true,
    			inputmode: false,
    			inputModeRadio: 1,
    			inputModeRadioDevice: 1,
    			kiGlobal: "A",
    			kiRadio: "B"
    		},
    		selectDevice: 0,
    		device: ["microphone1", "microphone2", "microphone3", "microphone4", "microphone5"],
    		selectRoom: 0,
    		room: ["Room1", "Room2", "Room3", "Room4"],
    		selectchannel: 0,
    		channel: ["Channel1", "Channel2", "Channel3", "Channel4"]
    	};

    	const mutList = ["Vf", "Vf1", "Vf2", "Vf3", "Vf4", "Vf5"];
    	const volumeWindowRoom = ["Общий", "Рация1", "Рация2"];

    	const volumeWindowPlayer = [
    		{
    			name: "Vf1",
    			room: 0,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf2",
    			room: 0,
    			value: 50,
    			distance: 10,
    			talk: true
    		},
    		{
    			name: "Vf3",
    			room: 0,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf4",
    			room: 0,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf5",
    			room: 0,
    			value: 50,
    			distance: 200,
    			talk: true
    		},
    		{
    			name: "Vf6",
    			room: 1,
    			value: 50,
    			distance: 100,
    			talk: false,
    			text: "[text]"
    		},
    		{
    			name: "Vf7",
    			room: 1,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf8",
    			room: 1,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf9",
    			room: 1,
    			value: 50,
    			distance: 50,
    			talk: true,
    			text: "[text]"
    		},
    		{
    			name: "Vf10",
    			room: 1,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf11",
    			room: 2,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf12",
    			room: 2,
    			value: 50,
    			distance: 100,
    			talk: true
    		},
    		{
    			name: "Vf13",
    			room: 2,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf14",
    			room: 2,
    			value: 50,
    			distance: 100,
    			talk: false
    		},
    		{
    			name: "Vf15",
    			room: 2,
    			value: 50,
    			distance: 100,
    			talk: false
    		}
    	];

    	const gui = {
    		mainWindowOpen: true,
    		deviceSelectOpen: false,
    		roomSelectOpen: false,
    		channelSelectOpen: false,
    		mutList: false,
    		volumeMainWindow: false
    	};

    	const move = {
    		nowMove: "",
    		ismove: false,
    		background: "#ffffff77",
    		elem: { shiftX: 0, shiftY: 0 },
    		owerlay: { left: 122, top: 19 },
    		owerlayMicrophone: { left: 78, top: 20 },
    		owerlayVolumeOn: { left: 25, top: 19 }
    	};

    	const selectButton = {
    		kiGlobal: false,
    		buttonkiGlobal: "A",
    		kiRadio: false,
    		buttonkiRadio: "S"
    	};

    	function keydown(event) {
    		if (gui.mainWindowOpen == false && event.key == "Insert") {
    			openMainWindow();
    		} else if (gui.mainWindowOpen == true && (event.key == "Escape" || event.key == "Insert")) {
    			closeMainWindow();
    		}

    		

    		if (selectButton.kiGlobal) {
    			let key = event.key;
    			key = key.length == 1 ? key.toUpperCase() : key;
    			$$invalidate(4, selectButton.buttonkiGlobal = key, selectButton);
    			$$invalidate(4, selectButton.kiGlobal = false, selectButton);
    		} else if (selectButton.kiRadio) {
    			let key = event.key;
    			key = key.length == 1 ? key.toUpperCase() : key;
    			$$invalidate(4, selectButton.buttonkiRadio = key, selectButton);
    			$$invalidate(4, selectButton.kiRadio = false, selectButton);
    		}

    		
    	}

    	

    	function closeMainWindow() {
    		$$invalidate(2, gui.mainWindowOpen = false, gui);
    		$$invalidate(2, gui.deviceSelectOpen = false, gui);
    		$$invalidate(2, gui.roomSelectOpen = false, gui);
    		$$invalidate(2, gui.channelSelectOpen = false, gui);
    		$$invalidate(2, gui.mutList = false, gui);
    		$$invalidate(2, gui.volumeMainWindow = false, gui);
    	}

    	

    	function openMainWindow() {
    		$$invalidate(2, gui.mainWindowOpen = true, gui);
    	}

    	

    	function handlerDrag(event) {
    		let arr = event.target.classList;

    		if (event.which == 1) {
    			$$invalidate(3, move.nowMove = event.target.id, move);
    			let id = event.target.id;

    			if (id == "owerlayMicrophone" || id == "owerlayVolumeOn" || id == "owerlay") {
    				$$invalidate(3, move.elem.shiftX = event.clientX - event.target.getBoundingClientRect().left, move);
    				$$invalidate(3, move.elem.shiftY = event.clientY - event.target.getBoundingClientRect().top, move);
    				$$invalidate(3, move.ismove = true, move);
    			}
    		}
    	}

    	

    	function onMouseMove(event) {
    		if (move.ismove) {
    			switch (move.nowMove) {
    				case "owerlay":
    					{
    						$$invalidate(3, move.background = "#ffffff77", move);
    						$$invalidate(3, move.owerlay.left = event.pageX - move.elem.shiftX, move);
    						$$invalidate(3, move.owerlay.top = event.pageY - move.elem.shiftY, move);
    						break;
    					}
    					
    				case "owerlayVolumeOn":
    					{
    						$$invalidate(3, move.owerlayVolumeOn.left = event.pageX - move.elem.shiftX, move);
    						$$invalidate(3, move.owerlayVolumeOn.top = event.pageY - move.elem.shiftY, move);

    						$$invalidate(
    							3,
    							move.owerlayVolumeOn.ondragstart = function () {
    								return false;
    							},
    							move
    						);

    						break;
    					}
    					
    				case "owerlayMicrophone":
    					{
    						$$invalidate(3, move.owerlayMicrophone.left = event.pageX - move.elem.shiftX, move);
    						$$invalidate(3, move.owerlayMicrophone.top = event.pageY - move.elem.shiftY, move);

    						$$invalidate(
    							3,
    							move.owerlayMicrophone.ondragstart = function () {
    								return false;
    							},
    							move
    						);

    						break;
    					}
    					
    			}
    		}
    	}

    	

    	function stopMove() {
    		$$invalidate(3, move.ismove = false, move);
    		$$invalidate(3, move.background = "#0000", move);
    	}

    	

    	function battonSelect(event) {
    		if (event.target.id == "kiGlobal") {
    			$$invalidate(4, selectButton.kiGlobal = true, selectButton);
    		} else if (event.target.id == "kiRadio") {
    			$$invalidate(4, selectButton.kiRadio = true, selectButton);
    		}
    	}

    	const $$binding_groups = [[], [], [], []];
    	const mousemove_handler = event => onMouseMove(event);
    	const mousedown_handler = event => handlerDrag(event);

    	function input_change_handler() {
    		config.selectDevice = this.__value;
    		$$invalidate(0, config);
    	}

    	const click_handler = () => $$invalidate(2, gui.deviceSelectOpen = false, gui);
    	const click_handler_1 = () => $$invalidate(2, gui.mutList = false, gui);

    	function input_change_handler_1() {
    		config.selectRoom = this.__value;
    		$$invalidate(0, config);
    	}

    	const click_handler_2 = () => $$invalidate(2, gui.roomSelectOpen = false, gui);

    	function input_change_handler_2() {
    		config.selectchannel = this.__value;
    		$$invalidate(0, config);
    	}

    	const click_handler_3 = () => $$invalidate(2, gui.channelSelectOpen = false, gui);

    	function input_change_input_handler(value, each_value_3, each_index) {
    		each_value_3[each_index].value = to_number(this.value);
    		$$invalidate(1, volumeWindowPlayer);
    	}

    	function input0_change_input_handler() {
    		config.main.soundVolume = to_number(this.value);
    		$$invalidate(0, config);
    	}

    	function input1_change_input_handler() {
    		config.main.microphoneVolume = to_number(this.value);
    		$$invalidate(0, config);
    	}

    	const click_handler_4 = () => $$invalidate(2, gui.deviceSelectOpen = true, gui);
    	const click_handler_5 = () => $$invalidate(2, gui.mutList = true, gui);
    	const click_handler_6 = () => $$invalidate(2, gui.volumeMainWindow = true, gui);

    	function input2_change_handler() {
    		config.main.triggerOnOffSound = this.checked;
    		$$invalidate(0, config);
    	}

    	function input3_change_handler() {
    		config.main.triggerSound3D = this.checked;
    		$$invalidate(0, config);
    	}

    	function input4_change_handler() {
    		config.main.inputmode = this.checked;
    		$$invalidate(0, config);
    	}

    	function input0_change_handler() {
    		config.main.inputModeRadio = this.__value;
    		$$invalidate(0, config);
    	}

    	function input1_change_handler() {
    		config.main.inputModeRadio = this.__value;
    		$$invalidate(0, config);
    	}

    	function input2_change_handler_1() {
    		config.main.inputModeRadio = this.__value;
    		$$invalidate(0, config);
    	}

    	const click_handler_7 = () => $$invalidate(2, gui.roomSelectOpen = true, gui);
    	const click_handler_8 = () => $$invalidate(2, gui.channelSelectOpen = true, gui);
    	const click_handler_9 = event => battonSelect(event);
    	const click_handler_10 = event => battonSelect(event);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [
    		config,
    		volumeWindowPlayer,
    		gui,
    		move,
    		selectButton,
    		mutList,
    		volumeWindowRoom,
    		keydown,
    		closeMainWindow,
    		handlerDrag,
    		onMouseMove,
    		stopMove,
    		battonSelect,
    		openMainWindow,
    		mousemove_handler,
    		mousedown_handler,
    		input_change_handler,
    		$$binding_groups,
    		click_handler,
    		click_handler_1,
    		input_change_handler_1,
    		click_handler_2,
    		input_change_handler_2,
    		click_handler_3,
    		input_change_input_handler,
    		input0_change_input_handler,
    		input1_change_input_handler,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		input2_change_handler,
    		input3_change_handler,
    		input4_change_handler,
    		input0_change_handler,
    		input1_change_handler,
    		input2_change_handler_1,
    		click_handler_7,
    		click_handler_8,
    		click_handler_9,
    		click_handler_10
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
