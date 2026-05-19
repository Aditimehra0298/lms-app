"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";
import "./Galaxy.css";

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;

varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);

  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + vec2(float(x), float(y));
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);

      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));

      vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;

      float star = Star(gv - offset - pad, flareSize);
      vec3 color = base;

      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      star *= twinkle;

      col += star * size * color;
    }
  }

  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;

  vec2 mouseNorm = uMouse - vec2(0.5);

  if (uAutoCenterRepulsion > 0.0) {
    vec2 centerUV = vec2(0.0, 0.0);
    float centerDist = length(uv - centerUV);
    vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
    uv += repulsion * 0.05;
  } else if (uMouseRepulsion) {
    vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
    float mouseDist = length(uv - mousePosUV);
    vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
    uv += repulsion * 0.05 * uMouseActiveFactor;
  } else {
    vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
    uv += mouseOffset;
  }

  float autoRotAngle = uTime * uRotationSpeed;
  mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
  uv = autoRot * uv;

  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

  vec3 col = vec3(0.0);

  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.32) * fade;
  }

  if (uTransparent) {
    float alpha = length(col);
    alpha = smoothstep(0.0, 0.3, alpha);
    alpha = min(alpha, 1.0);
    gl_FragColor = vec4(col, alpha);
  } else {
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "Unknown shader error";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string) {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "Unknown link error";
    gl.deleteProgram(program);
    throw new Error(log);
  }
  return program;
}

/** Full-screen triangle: interleaved position (xy) + uv (xy) per vertex. */
const TRIANGLE_DATA = new Float32Array([
  -1, -1, 0, 0,
  3, -1, 2, 0,
  -1, 3, 0, 2,
]);
const TRIANGLE_STRIDE = 16;
const TRIANGLE_POS_OFFSET = 0;
const TRIANGLE_UV_OFFSET = 8;

export type GalaxyProps = {
  focal?: [number, number];
  rotation?: [number, number];
  starSpeed?: number;
  density?: number;
  hueShift?: number;
  disableAnimation?: boolean;
  speed?: number;
  mouseInteraction?: boolean;
  glowIntensity?: number;
  saturation?: number;
  mouseRepulsion?: boolean;
  repulsionStrength?: number;
  twinkleIntensity?: number;
  rotationSpeed?: number;
  autoCenterRepulsion?: number;
  transparent?: boolean;
} & HTMLAttributes<HTMLDivElement>;

export default function Galaxy({
  focal = [0.5, 0.5],
  rotation = [1.0, 0.0],
  starSpeed = 0.5,
  density = 1,
  hueShift = 140,
  disableAnimation = false,
  speed = 1.0,
  mouseInteraction = true,
  glowIntensity = 0.3,
  saturation = 0.0,
  mouseRepulsion = true,
  repulsionStrength = 2,
  twinkleIntensity = 0.3,
  rotationSpeed = 0.1,
  autoCenterRepulsion = 0,
  transparent = true,
  className,
  ...rest
}: GalaxyProps) {
  const ctnDom = useRef<HTMLDivElement>(null);
  const targetMousePos = useRef({ x: 0.5, y: 0.5 });
  const smoothMousePos = useRef({ x: 0.5, y: 0.5 });
  const targetMouseActive = useRef(0.0);
  const smoothMouseActive = useRef(0.0);

  useEffect(() => {
    if (!ctnDom.current) return;
    const ctn = ctnDom.current;

    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    const glContext = canvas.getContext("webgl", {
      alpha: transparent,
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!glContext) return;
    const gl = glContext;

    const program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    const posLoc = gl.getAttribLocation(program, "position");
    const uvLoc = gl.getAttribLocation(program, "uv");

    const triBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
    gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE_DATA, gl.STATIC_DRAW);

    function bindTriangleAttribs() {
      gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
      if (posLoc >= 0) {
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, TRIANGLE_STRIDE, TRIANGLE_POS_OFFSET);
      }
      if (uvLoc >= 0) {
        gl.enableVertexAttribArray(uvLoc);
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, TRIANGLE_STRIDE, TRIANGLE_UV_OFFSET);
      }
    }
    bindTriangleAttribs();

    const uniforms = {
      uTime: gl.getUniformLocation(program, "uTime"),
      uResolution: gl.getUniformLocation(program, "uResolution"),
      uFocal: gl.getUniformLocation(program, "uFocal"),
      uRotation: gl.getUniformLocation(program, "uRotation"),
      uStarSpeed: gl.getUniformLocation(program, "uStarSpeed"),
      uDensity: gl.getUniformLocation(program, "uDensity"),
      uHueShift: gl.getUniformLocation(program, "uHueShift"),
      uSpeed: gl.getUniformLocation(program, "uSpeed"),
      uMouse: gl.getUniformLocation(program, "uMouse"),
      uGlowIntensity: gl.getUniformLocation(program, "uGlowIntensity"),
      uSaturation: gl.getUniformLocation(program, "uSaturation"),
      uMouseRepulsion: gl.getUniformLocation(program, "uMouseRepulsion"),
      uTwinkleIntensity: gl.getUniformLocation(program, "uTwinkleIntensity"),
      uRotationSpeed: gl.getUniformLocation(program, "uRotationSpeed"),
      uRepulsionStrength: gl.getUniformLocation(program, "uRepulsionStrength"),
      uMouseActiveFactor: gl.getUniformLocation(program, "uMouseActiveFactor"),
      uAutoCenterRepulsion: gl.getUniformLocation(program, "uAutoCenterRepulsion"),
      uTransparent: gl.getUniformLocation(program, "uTransparent"),
    };

    gl.uniform2fv(uniforms.uFocal, focal);
    gl.uniform2fv(uniforms.uRotation, rotation);
    gl.uniform1f(uniforms.uDensity, density);
    gl.uniform1f(uniforms.uHueShift, hueShift);
    gl.uniform1f(uniforms.uSpeed, speed);
    gl.uniform1f(uniforms.uGlowIntensity, glowIntensity);
    gl.uniform1f(uniforms.uSaturation, saturation);
    gl.uniform1i(uniforms.uMouseRepulsion, mouseRepulsion ? 1 : 0);
    gl.uniform1f(uniforms.uTwinkleIntensity, twinkleIntensity);
    gl.uniform1f(uniforms.uRotationSpeed, rotationSpeed);
    gl.uniform1f(uniforms.uRepulsionStrength, repulsionStrength);
    gl.uniform1f(uniforms.uAutoCenterRepulsion, autoCenterRepulsion);
    gl.uniform1i(uniforms.uTransparent, transparent ? 1 : 0);

    if (transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    } else {
      gl.clearColor(0, 0, 0, 1);
    }

    function setResolution(width: number, height: number) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(width * dpr));
      const h = Math.max(1, Math.floor(height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform3f(uniforms.uResolution, w, h, w / h);
    }

    function resize() {
      const w = ctn.clientWidth;
      const h = ctn.clientHeight;
      if (w > 0 && h > 0) {
        setResolution(w, h);
      }
    }

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(ctn);
    window.addEventListener("resize", resize, false);

    let animateId = 0;

    function update(t: number) {
      animateId = requestAnimationFrame(update);

      gl.useProgram(program);
      bindTriangleAttribs();

      if (!disableAnimation) {
        gl.uniform1f(uniforms.uTime, t * 0.001);
        gl.uniform1f(uniforms.uStarSpeed, (t * 0.001 * starSpeed) / 10.0);
      }

      const lerpFactor = 0.05;
      smoothMousePos.current.x += (targetMousePos.current.x - smoothMousePos.current.x) * lerpFactor;
      smoothMousePos.current.y += (targetMousePos.current.y - smoothMousePos.current.y) * lerpFactor;
      smoothMouseActive.current += (targetMouseActive.current - smoothMouseActive.current) * lerpFactor;

      gl.uniform2f(uniforms.uMouse, smoothMousePos.current.x, smoothMousePos.current.y);
      gl.uniform1f(uniforms.uMouseActiveFactor, smoothMouseActive.current);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    ctn.appendChild(canvas);
    requestAnimationFrame(() => {
      resize();
      animateId = requestAnimationFrame(update);
    });

    function handleMouseMove(e: MouseEvent) {
      const rect = ctn.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      targetMousePos.current = { x, y };
      targetMouseActive.current = 1.0;
    }

    function handleMouseLeave() {
      targetMouseActive.current = 0.0;
    }

    if (mouseInteraction) {
      ctn.addEventListener("mousemove", handleMouseMove);
      ctn.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      cancelAnimationFrame(animateId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      if (mouseInteraction) {
        ctn.removeEventListener("mousemove", handleMouseMove);
        ctn.removeEventListener("mouseleave", handleMouseLeave);
      }
      if (canvas.parentNode === ctn) {
        ctn.removeChild(canvas);
      }
      gl.deleteProgram(program);
      gl.deleteBuffer(triBuf);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [
    focal,
    rotation,
    starSpeed,
    density,
    hueShift,
    disableAnimation,
    speed,
    mouseInteraction,
    glowIntensity,
    saturation,
    mouseRepulsion,
    twinkleIntensity,
    rotationSpeed,
    repulsionStrength,
    autoCenterRepulsion,
    transparent,
  ]);

  return (
    <div
      ref={ctnDom}
      className={className ? `galaxy-container ${className}` : "galaxy-container"}
      {...rest}
    />
  );
}
