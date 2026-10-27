import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SatinFlow from '../components/lightswind/satin-flow';

describe('SatinFlow Component Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders canvas element inside container with backdrop blur styles', () => {
    const { container } = render(
      <SatinFlow
        colors={['#02172d', '#0284c7', '#38bdf8']}
        speed={1.0}
        scale={1.0}
        backdropBlurAmount="md"
        className="test-custom-class"
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('test-custom-class');
    expect(wrapper.querySelector('.backdrop-blur-md')).toBeInTheDocument();
  });

  it('handles missing WebGL context gracefully without crashing', () => {
    // In JSDOM, canvas.getContext('webgl') returns null by default
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => {
      render(<SatinFlow />);
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith('WebGL not supported for SatinFlow');
  });

  it('removes event listeners and cleans up resources on unmount when WebGL is initialized', () => {
    const mockGl = {
      createShader: vi.fn().mockReturnValue({}),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn().mockReturnValue(true),
      createProgram: vi.fn().mockReturnValue({}),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn().mockReturnValue(true),
      useProgram: vi.fn(),
      createBuffer: vi.fn().mockReturnValue({}),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn().mockReturnValue(0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      getUniformLocation: vi.fn().mockReturnValue({}),
      uniform2f: vi.fn(),
      uniform1f: vi.fn(),
      uniform3fv: vi.fn(),
      drawArrays: vi.fn(),
      viewport: vi.fn(),
      deleteProgram: vi.fn(),
      deleteShader: vi.fn(),
      deleteBuffer: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockGl as unknown as RenderingContext);
    const removeEventListenerSpy = vi.spyOn(HTMLElement.prototype, 'removeEventListener');

    const { unmount } = render(<SatinFlow interactive={true} />);
    unmount();

    expect(mockGl.deleteProgram).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});
