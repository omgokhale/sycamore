import React, { useEffect, useRef } from 'react';

function AsciiAnimation() {
  const animationRef = useRef(null);
  const timeRef = useRef(0);

  useEffect(() => {
    // Configuration - made smaller and slower
    const charset = "_||}}}══╒╒╓╓╓╓╒╒══}}|}___|___}}}}══╒╒╓╓╓╒═}}}}__";
    const frameWidth = 60; // Reduced from 120
    const frameHeight = 15; // Reduced from 30
    const xConstant = 0.05;
    const yConstant = 19.1;
    const frameMultiplier = 0.019;
    const animationSpeed = 50; // Increased from 1ms to 50ms for slower animation
    const globalVal = 3.8;
    const mirrorAxis = "x";

    // Light gray to white color scheme
    const colors = [
      "#E0E0E0", // Light gray
      "#E8E8E8", // Lighter gray
      "#F0F0F0", // Very light gray
      "#F8F8F8", // Almost white
      "#FFFFFF"  // White
    ];

    function animate() {
      let output = "";

      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          let mirrorX = x;
          let mirrorY = y;

          if (mirrorAxis === "x" && x > frameWidth / 2) {
            mirrorX = frameWidth - x;
          }

          // Center spiral pattern
          let dx = mirrorX - frameWidth / 2;
          let dy = mirrorY - frameHeight / 2;
          let theta = Math.atan2(dy, dx) + xConstant;
          let curvature = Math.sin(theta * yConstant);
          let wave = globalVal * Math.sin(mirrorX * xConstant + timeRef.current);
          let density = Math.sin(theta * frameMultiplier);
          let localSpeed = Math.sin(mirrorX * xConstant + mirrorY * yConstant);
          let r = (theta + (timeRef.current + localSpeed) * frameMultiplier + curvature + wave) * (1 + density);
          let value = Math.sin(r);

          const index = Math.floor((value + 2) / 4 * charset.length);
          const color = colors[index % colors.length];
          const char = charset[index] || charset.charAt(charset.length - 1);
          output += '<span style="color:' + color + '">' + char + '</span>';
        }
        output += "\n";
      }

      if (animationRef.current) {
        animationRef.current.innerHTML = output;
      }

      timeRef.current += frameMultiplier;
      setTimeout(animate, animationSpeed);
    }

    animate();

    // Cleanup on unmount
    return () => {
      timeRef.current = 0;
    };
  }, []);

  return (
    <div className="ascii-animation">
      <pre ref={animationRef} className="ascii-frame"></pre>
    </div>
  );
}

export default AsciiAnimation;
