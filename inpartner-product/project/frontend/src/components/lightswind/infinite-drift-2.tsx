"use client";

import React, {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { cn } from "@/lib/utils";

export interface InfiniteDrift2Props {
  /** Array of image URLs to tile across the 3D dome */
  images?: string[];
  /** Tile width in pixels */
  tileWidth?: number;
  /** Tile height in pixels */
  tileHeight?: number;
  /** Gap between tiles in pixels */
  gap?: number;
  /** Rounded corner radius for each tile in pixels */
  borderRadius?: number;
  /** Curve lens distortion factor (0 = flat grid, 0.35 = subtle dome, 0.8+ = deep fisheye) */
  curve?: number;
  /** Radial reach threshold for the dome curve */
  curveRadius?: number;
  /** Zoom scale multiplier */
  zoom?: number;
  /** Rotation angle in degrees for individual tiles */
  tileRotation?: number;
  /** Grayscale amount (0.0 = full color, 1.0 = pure monochrome) */
  grayscale?: number;
  /** Vignette edge darkening intensity (0.0 to 1.0) */
  vignette?: number;
  /** Automatic continuous scrolling speed along X axis */
  autoScrollX?: number;
  /** Automatic continuous scrolling speed along Y axis */
  autoScrollY?: number;
  /** Enable mouse & touch drag panning */
  enableDrag?: boolean;
  /** Enable mouse wheel panning */
  enableWheel?: boolean;
  /** Allowed panning axis */
  axis?: "both" | "x" | "y";
  /** Sensitivity factor for dragging */
  dragSensitivity?: number;
  /** Sensitivity factor for mouse wheel */
  wheelSensitivity?: number;
  /** Friction / inertia decay factor (0.80 to 0.98) */
  friction?: number;
  /** Background color behind the canvas */
  backgroundColor?: string;
  /** Maximum device pixel ratio for sharp rendering */
  dpr?: number;
  /** Container height in px or string */
  height?: number | string;
  /** Container width in px or string */
  width?: number | string;
  /** Custom container className */
  className?: string;
  /** Optional overlay children (e.g. hero text, buttons) */
  children?: React.ReactNode;
}

export interface InfiniteDrift2Ref {
  resetOffset: () => void;
  setOffset: (x: number, y: number) => void;
  getOffset: () => { x: number; y: number };
}

// Backwards-compatibility alias
export type InvertedDomeProps = InfiniteDrift2Props;

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1550684399-3f0f745771d1?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
];

// Vertex Shader: Fullscreen quad
const VS_SOURCE = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

// Fragment Shader: 3D Inverted Dome Lens Distortion & Procedural Tiled Grid
const FS_SOURCE = `
  precision highp float;
  varying vec2 vUv;

  uniform vec2 uResolution;
  uniform vec2 uOffset;
  uniform vec2 uTileSize;
  uniform float uGap;
  uniform float uBorderRadius;
  uniform float uCurve;
  uniform float uCurveRadius;
  uniform float uZoom;
  uniform float uTileRotation;
  uniform float uGrayscale;
  uniform float uVignette;
  uniform sampler2D uAtlas;
  uniform vec2 uAtlasGrid;

  // Signed distance function for rounded rectangle
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    // 1. Normalized center coordinates (-1 to 1 based on minimal dimension)
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
    float r = length(p);

    // 2. Inverted Dome / Lens Distortion Formula
    float maxDist = max(0.001, uCurveRadius);
    float normR = clamp(r / maxDist, 0.0, 1.0);
    float distortion = 1.0 + uCurve * pow(normR, 2.0) - uZoom;
    vec2 distortedCoord = p * distortion;

    // Convert back to pixel coordinate space with dynamic panning offset
    vec2 worldPos = distortedCoord * min(uResolution.x, uResolution.y) + uOffset;

    // 3. Tile Calculations
    vec2 stepSize = uTileSize + vec2(uGap);
    vec2 cell = floor(worldPos / stepSize);
    vec2 localPos = mod(worldPos, stepSize) - 0.5 * stepSize;

    // Tile individual rotation
    float angle = radians(uTileRotation);
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 rotatedLocal = rot * localPos;

    // Anti-aliased rounded rectangle mask
    float d = sdRoundedBox(rotatedLocal, uTileSize * 0.5, uBorderRadius);
    float alpha = 1.0 - smoothstep(-0.8, 0.8, d);

    if (alpha <= 0.0) {
      discard;
    }

    // 4. Map cell coordinates to atlas texture grid (3x3 default)
    vec2 tileUv = clamp((rotatedLocal / uTileSize) + 0.5, 0.0, 1.0);
    
    // Atlas index with positive modulo
    vec2 atlasCell = mod(mod(cell, uAtlasGrid) + uAtlasGrid, uAtlasGrid);
    
    // Invert row index to match Canvas 2D top-down vs WebGL bottom-up
    float atlasRow = uAtlasGrid.y - 1.0 - atlasCell.y;
    vec2 uv = (vec2(atlasCell.x, atlasRow) + tileUv) / uAtlasGrid;

    vec4 texColor = texture2D(uAtlas, uv);

    // Grayscale transition
    float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    vec3 color = mix(texColor.rgb, vec3(gray), clamp(uGrayscale, 0.0, 1.0));

    // Vignette lighting
    float vigFactor = smoothstep(0.35, 1.15, r * (1.0 + uVignette * 0.5));
    color = mix(color, color * (1.0 - uVignette * vigFactor), clamp(uVignette, 0.0, 1.0));

    gl_FragColor = vec4(color, texColor.a * alpha);
  }
`;

export const InfiniteDrift2 = forwardRef<
  InfiniteDrift2Ref,
  InfiniteDrift2Props
>(
  (
    {
      images = DEFAULT_IMAGES,
      tileWidth = 220,
      tileHeight = 220,
      gap = 18,
      borderRadius = 18,
      curve = 0.35,
      curveRadius = 1.5,
      zoom = 0.08,
      tileRotation = 0,
      grayscale = 0.0,
      vignette = 0.25,
      autoScrollX = 0.4,
      autoScrollY = 0.15,
      enableDrag = true,
      enableWheel = true,
      axis = "both",
      dragSensitivity = 1.0,
      wheelSensitivity = 0.6,
      friction = 0.92,
      backgroundColor = "transparent",
      dpr = 2,
      height = 620,
      width = "100%",
      className = "",
      children,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const offset = useRef({ x: 0, y: 0 });
    const velocity = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const lastPointer = useRef({ x: 0, y: 0 });

    useImperativeHandle(ref, () => ({
      resetOffset: () => {
        offset.current = { x: 0, y: 0 };
        velocity.current = { x: 0, y: 0 };
      },
      setOffset: (x: number, y: number) => {
        offset.current = { x, y };
      },
      getOffset: () => ({ ...offset.current }),
    }));

    const propsRef = useRef({
      tileWidth,
      tileHeight,
      gap,
      borderRadius,
      curve,
      curveRadius,
      zoom,
      tileRotation,
      grayscale,
      vignette,
      autoScrollX,
      autoScrollY,
      axis,
      friction,
      dpr,
    });

    useEffect(() => {
      propsRef.current = {
        tileWidth,
        tileHeight,
        gap,
        borderRadius,
        curve,
        curveRadius,
        zoom,
        tileRotation,
        grayscale,
        vignette,
        autoScrollX,
        autoScrollY,
        axis,
        friction,
        dpr,
      };
    });

    // WebGL Context & Shaders Setup
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let isMounted = true;

      const gl = (canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
      }) || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

      if (!gl) return;

      // Helper: Compile GLSL shader
      const compileShader = (source: string, type: number) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error(gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vs = compileShader(VS_SOURCE, gl.VERTEX_SHADER);
      const fs = compileShader(FS_SOURCE, gl.FRAGMENT_SHADER);
      if (!vs || !fs) return;

      const program = gl.createProgram();
      if (!program) return;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return;
      }
      gl.useProgram(program);

      // Fullscreen quad buffer
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const aPos = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // Build 3x3 Texture Atlas
      const atlasCanvas = document.createElement("canvas");
      const atlasDim = 1536;
      const gridCount = 3;
      const cellDim = atlasDim / gridCount;
      atlasCanvas.width = atlasDim;
      atlasCanvas.height = atlasDim;
      const ctx = atlasCanvas.getContext("2d", { willReadFrequently: true });

      // Initialize with sleek, rich procedural gradient artwork as instant fallback
      if (ctx) {
        const palette = [
          ["#38bdf8", "#1d4ed8"],
          ["#ec4899", "#8b5cf6"],
          ["#10b981", "#06b6d4"],
          ["#f59e0b", "#ef4444"],
          ["#a855f7", "#ec4899"],
          ["#6366f1", "#4338ca"],
          ["#06b6d4", "#0284c7"],
          ["#f43f5e", "#fb923c"],
          ["#14b8a6", "#047857"],
        ];
        const titles = [
          "CYBER", "NEBULA", "SPECTRUM",
          "KINETIC", "SPATIAL", "LUMINA",
          "PRISM", "HORIZON", "AURORA"
        ];

        for (let i = 0; i < 9; i++) {
          const gx = i % gridCount;
          const gy = Math.floor(i / gridCount);
          const x = gx * cellDim;
          const y = gy * cellDim;

          const grad = ctx.createLinearGradient(x, y, x + cellDim, y + cellDim);
          const [c1, c2] = palette[i % palette.length];
          grad.addColorStop(0, c1);
          grad.addColorStop(1, c2);
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, cellDim, cellDim);

          // Subtle inner vignette
          const radGrad = ctx.createRadialGradient(
            x + cellDim / 2, y + cellDim / 2, cellDim * 0.1,
            x + cellDim / 2, y + cellDim / 2, cellDim * 0.7
          );
          radGrad.addColorStop(0, "rgba(255,255,255,0.2)");
          radGrad.addColorStop(0.7, "rgba(0,0,0,0.15)");
          radGrad.addColorStop(1, "rgba(0,0,0,0.5)");
          ctx.fillStyle = radGrad;
          ctx.fillRect(x, y, cellDim, cellDim);

          // Grid line pattern
          ctx.strokeStyle = "rgba(255,255,255,0.12)";
          ctx.lineWidth = 3;
          for (let step = 64; step < cellDim; step += 64) {
            ctx.beginPath();
            ctx.moveTo(x + step, y);
            ctx.lineTo(x + step, y + cellDim);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y + step);
            ctx.lineTo(x + cellDim, y + step);
            ctx.stroke();
          }

          // Badge title
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 44px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(titles[i], x + cellDim / 2, y + cellDim / 2);
        }
      }

      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      // NOTE: For NPOT textures in WebGL 1.0, wrap modes MUST be CLAMP_TO_EDGE.
      // Using REPEAT will cause the texture to be incomplete and render solid black!
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        atlasCanvas
      );

      // Asynchronously load real images into the atlas
      const imageList = images && images.length > 0 ? images : DEFAULT_IMAGES;
      imageList.slice(0, 9).forEach((url, i) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (!isMounted || !ctx || !gl) return;
          const gx = i % gridCount;
          const gy = Math.floor(i / gridCount);
          const x = gx * cellDim;
          const y = gy * cellDim;

          // Cover crop
          const imgAspect = img.naturalWidth / (img.naturalHeight || 1);
          let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
          if (imgAspect > 1) {
            sw = sh;
            sx = (img.naturalWidth - sw) / 2;
          } else {
            sh = sw;
            sy = (img.naturalHeight - sh) / 2;
          }

          ctx.drawImage(img, sx, sy, sw, sh, x, y, cellDim, cellDim);
          try {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              atlasCanvas
            );
          } catch (e) {
            console.warn("Could not upload texture to WebGL:", e);
          }
        };
        img.src = url;
      });

      // Uniform Locations
      const uRes = gl.getUniformLocation(program, "uResolution");
      const uOff = gl.getUniformLocation(program, "uOffset");
      const uTile = gl.getUniformLocation(program, "uTileSize");
      const uG = gl.getUniformLocation(program, "uGap");
      const uRad = gl.getUniformLocation(program, "uBorderRadius");
      const uCurv = gl.getUniformLocation(program, "uCurve");
      const uCurvRad = gl.getUniformLocation(program, "uCurveRadius");
      const uZm = gl.getUniformLocation(program, "uZoom");
      const uRot = gl.getUniformLocation(program, "uTileRotation");
      const uGray = gl.getUniformLocation(program, "uGrayscale");
      const uVig = gl.getUniformLocation(program, "uVignette");
      const uAtlas = gl.getUniformLocation(program, "uAtlas");
      const uAtlasGrid = gl.getUniformLocation(program, "uAtlasGrid");

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      let animId: number;
      let lastTime = performance.now();

      const render = (time: number) => {
        const dt = Math.min(0.1, (time - lastTime) / 1000);
        lastTime = time;
        const p = propsRef.current;

        // Inertia & Auto-scroll
        if (!isDragging.current) {
          if (p.axis !== "y") {
            offset.current.x += (velocity.current.x + p.autoScrollX * 60) * dt;
          }
          if (p.axis !== "x") {
            offset.current.y += (velocity.current.y + p.autoScrollY * 60) * dt;
          }

          velocity.current.x *= Math.pow(p.friction, dt * 60);
          velocity.current.y *= Math.pow(p.friction, dt * 60);
        }

        // Viewport resize handling
        const targetDpr = Math.min(window.devicePixelRatio || 1, p.dpr);
        const w = Math.floor(canvas.clientWidth * targetDpr);
        const h = Math.floor(canvas.clientHeight * targetDpr);

        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Bind active texture unit 0
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(uAtlas, 0);

        gl.uniform2f(uRes, w, h);
        gl.uniform2f(uOff, offset.current.x, offset.current.y);
        gl.uniform2f(uTile, p.tileWidth, p.tileHeight);
        gl.uniform1f(uG, p.gap);
        gl.uniform1f(uRad, p.borderRadius);
        gl.uniform1f(uCurv, p.curve);
        gl.uniform1f(uCurvRad, p.curveRadius);
        gl.uniform1f(uZm, p.zoom);
        gl.uniform1f(uRot, p.tileRotation);
        gl.uniform1f(uGray, p.grayscale);
        gl.uniform1f(uVig, p.vignette);
        gl.uniform2f(uAtlasGrid, gridCount, gridCount);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animId = requestAnimationFrame(render);
      };

      animId = requestAnimationFrame(render);

      return () => {
        isMounted = false;
        cancelAnimationFrame(animId);
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteTexture(texture);
        gl.deleteBuffer(buffer);
      };
    }, [images]);

    // Pointer Drag Handling
    const handlePointerDown = (e: React.PointerEvent) => {
      if (!enableDrag) return;
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      velocity.current = { x: 0, y: 0 };
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const dx = (e.clientX - lastPointer.current.x) * dragSensitivity;
      const dy = (e.clientY - lastPointer.current.y) * dragSensitivity;

      if (axis !== "y") {
        offset.current.x -= dx;
        velocity.current.x = -dx * 20;
      }
      if (axis !== "x") {
        offset.current.y += dy;
        velocity.current.y = dy * 20;
      }

      lastPointer.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      isDragging.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    };

    const handleWheel = useCallback(
      (e: WheelEvent) => {
        if (!enableWheel) return;
        e.preventDefault();
        if (axis !== "y") offset.current.x += e.deltaX * wheelSensitivity;
        if (axis !== "x") offset.current.y -= e.deltaY * wheelSensitivity;
      },
      [enableWheel, axis, wheelSensitivity]
    );

    useEffect(() => {
      const container = containerRef.current;
      if (!container || !enableWheel) return;

      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }, [handleWheel, enableWheel]);

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden select-none cursor-grab active:cursor-grabbing",
          "w-full rounded-2xl",
          className
        )}
        style={{
          height,
          width,
          backgroundColor,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="region"
        aria-label="3D Infinite Drift 2 Dome Gallery"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
        {children && (
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
            {children}
          </div>
        )}
      </div>
    );
  }
);

InfiniteDrift2.displayName = "InfiniteDrift2";

// Backwards-compatible named export
export const InvertedDome = InfiniteDrift2;

export default InfiniteDrift2;
