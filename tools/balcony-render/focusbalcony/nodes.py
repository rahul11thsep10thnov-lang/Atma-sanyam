"""Tiny helper for building Cycles node trees in code."""
import bpy


def _sock(collection, key):
    if isinstance(key, int):
        return collection[key]
    enabled = [s for s in collection if s.enabled]
    for s in enabled:
        if s.identifier == key:
            return s
    for s in enabled:
        if s.name == key:
            return s
    for s in collection:
        if s.identifier == key or s.name == key:
            return s
    raise KeyError(f"socket {key!r} not in {[s.identifier for s in collection]}")


class Tree:
    def __init__(self, material_name: str):
        self.mat = bpy.data.materials.new(material_name)
        self.mat.use_nodes = True
        self.nt = self.mat.node_tree
        self.nt.nodes.clear()
        self.out = self.nt.nodes.new("ShaderNodeOutputMaterial")

    def node(self, kind: str, inputs: dict | None = None, **props):
        n = self.nt.nodes.new(kind)
        for k, v in props.items():
            setattr(n, k, v)
        for k, v in (inputs or {}).items():
            self.set(n, k, v)
        return n

    def set(self, node, key, value):
        s = _sock(node.inputs, key)
        if isinstance(value, tuple) and hasattr(value[0], "outputs"):
            self.link(value, s)
        elif hasattr(value, "is_output"):
            self.nt.links.new(value, s)
        elif hasattr(value, "outputs"):
            self.nt.links.new(value.outputs[0], s)
        else:
            if isinstance(value, (tuple, list)) and len(value) == 3 and len(s.default_value) == 4:
                value = (*value, 1.0)
            s.default_value = value

    def o(self, node, key=0):
        return _sock(node.outputs, key)

    def link(self, src, dst_socket):
        """src: socket, node (first output) or (node, key)."""
        if isinstance(src, tuple):
            src = self.o(src[0], src[1])
        elif hasattr(src, "outputs"):
            src = src.outputs[0]
        self.nt.links.new(src, dst_socket)

    def surface(self, shader):
        self.link(shader, self.out.inputs["Surface"])
        return self.mat

    def displacement(self, node):
        self.link(node, self.out.inputs["Displacement"])

    # ---- common building blocks ---------------------------------------

    def coords(self, space="Object", scale=(1, 1, 1), rotation=(0, 0, 0), location=(0, 0, 0)):
        tc = self.node("ShaderNodeTexCoord")
        mp = self.node("ShaderNodeMapping", {"Scale": scale, "Rotation": rotation, "Location": location})
        self.link((tc, space), _sock(mp.inputs, "Vector"))
        return mp

    def noise(self, vector, scale=5.0, detail=4.0, roughness=0.5, distortion=0.0):
        return self.node("ShaderNodeTexNoise", {"Vector": vector, "Scale": scale, "Detail": detail,
                                                "Roughness": roughness, "Distortion": distortion})

    def ramp(self, fac, stops):
        """stops: [(pos, (r,g,b)), ...] in linear RGB."""
        r = self.node("ShaderNodeValToRGB")
        self.set(r, "Fac", fac)
        els = r.color_ramp.elements
        while len(els) > 2:
            els.remove(els[-1])
        for i, (pos, col) in enumerate(stops):
            e = els[i] if i < 2 else els.new(pos)
            e.position = pos
            e.color = (*col, 1.0)
        return r

    def mix_color(self, fac, a, b, blend="MIX"):
        m = self.node("ShaderNodeMix", data_type="RGBA", blend_type=blend)
        self.set(m, "Factor_Float", fac)
        self.set(m, "A_Color", a)
        self.set(m, "B_Color", b)
        return (m, "Result_Color")

    def math(self, op, a, b=0.0, clamp=False):
        m = self.node("ShaderNodeMath", operation=op, use_clamp=clamp)
        self.set(m, 0, a)
        self.set(m, 1, b)
        return m

    def map_range(self, value, from_min, from_max, to_min, to_max):
        return self.node("ShaderNodeMapRange", {"Value": value, "From Min": from_min, "From Max": from_max,
                                                "To Min": to_min, "To Max": to_max})

    def bump(self, height, strength=0.1, distance=0.01, normal=None):
        b = self.node("ShaderNodeBump", {"Height": height, "Strength": strength, "Distance": distance})
        if normal is not None:
            self.set(b, "Normal", normal)
        return b

    def principled(self, base, roughness=0.5, normal=None, **extra):
        p = self.node("ShaderNodeBsdfPrincipled", {"Base Color": base, "Roughness": roughness})
        if normal is not None:
            self.set(p, "Normal", normal)
        for k, v in extra.items():
            self.set(p, k.replace("_", " "), v)
        return p
