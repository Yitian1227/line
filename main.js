document.addEventListener('DOMContentLoaded', function() {
    console.log('全畫面波浪動畫已載入！');
    
    // 建立 canvas 元素並插入 body
    const canvas = document.createElement('canvas');
    canvas.id = 'waveCanvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    // Add dark background to body
    document.body.style.backgroundColor = '#1a1a2e';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    // Add controls div
    const controlsDiv = document.createElement('div');
    controlsDiv.style.position = 'fixed';
    controlsDiv.style.top = '20px';
    controlsDiv.style.left = '20px';
    controlsDiv.style.padding = '15px';
    controlsDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    controlsDiv.style.borderRadius = '8px';
    controlsDiv.style.color = 'white';
    controlsDiv.style.fontFamily = 'Arial, sans-serif';
    controlsDiv.style.zIndex = '1000';
    document.body.appendChild(controlsDiv);

    // Create sliders
    const createSlider = (label, min, max, value, onChange) => {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';

        const labelElement = document.createElement('div');
        labelElement.textContent = label;
        labelElement.style.marginBottom = '5px';
        container.appendChild(labelElement);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.value = value;
        slider.style.width = '200px';
        container.appendChild(slider);

        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = value;
        valueDisplay.style.marginLeft = '10px';
        valueDisplay.style.minWidth = '40px';
        valueDisplay.style.display = 'inline-block';
        container.appendChild(valueDisplay);

        slider.addEventListener('input', () => {
            valueDisplay.textContent = slider.value;
            onChange(parseFloat(slider.value));
        });

        controlsDiv.appendChild(container);
        return slider;
    };

    // Animation parameters
    const params = {
        baseLines: 150,
        clusterSize: 8,
        amplitude: 120,
        frequency: 0.003,
        speed: 0.002,
        pointsPerLine: 12,
        pointRadius: 4,
        pointGlow: 8
    };

    // Create control sliders
    createSlider('波長', 1, 100, 50, (value) => {
        params.frequency = 0.006 - (value / 100) * 0.005;
    });
    createSlider('速度', 1, 100, 50, (value) => {
        params.speed = (value / 100) * 0.004;
    });
    createSlider('波幅', 10, 200, 120, (value) => {
        params.amplitude = value;
    });
    createSlider('點的大小', 1, 10, 4, (value) => {
        params.pointRadius = value;
        params.pointGlow = value * 2;
    });
    createSlider('點的數量', 5, 20, 12, (value) => {
        params.pointsPerLine = Math.floor(value);
    });

    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Points and squares parameters
    const points = [];
    const squares = [];
    const squareLifespan = 30;
    const maxSquareDeviation = 15;

    // Secondary wave parameters for natural movement
    const secondaryWave = {
        frequency: 0.0006,
        amplitude: 50,
        speed: 0.001
    };

    class Point {
        constructor(x, y, lineIndex, isReverse) {
            this.x = x;
            this.y = y;
            this.lineIndex = lineIndex;
            this.isReverse = isReverse;
            this.glowIntensity = 0.8 + Math.random() * 0.2;
        }
    }

    class Square {
        constructor(points) {
            this.points = points;
            this.life = squareLifespan;
            this.opacity = 1;
        }
    }

    function isSquare(p1, p2, p3, p4) {
        // Calculate distances between all points
        const distances = [
            Math.hypot(p2.x - p1.x, p2.y - p1.y),
            Math.hypot(p3.x - p2.x, p3.y - p2.y),
            Math.hypot(p4.x - p3.x, p4.y - p3.y),
            Math.hypot(p1.x - p4.x, p1.y - p4.y),
            Math.hypot(p3.x - p1.x, p3.y - p1.y), // diagonal
            Math.hypot(p4.x - p2.x, p4.y - p2.y)  // diagonal
        ];

        // Check if all sides are approximately equal and diagonals are approximately equal
        const side = distances[0];
        const diagonal = distances[4];
        
        return distances.slice(0, 4).every(d => Math.abs(d - side) < maxSquareDeviation) &&
               Math.abs(distances[4] - distances[5]) < maxSquareDeviation;
    }

    function detectSquares() {
        for (let i = 0; i < points.length - 3; i++) {
            for (let j = i + 1; j < points.length - 2; j++) {
                for (let k = j + 1; k < points.length - 1; k++) {
                    for (let l = k + 1; l < points.length; l++) {
                        if (isSquare(points[i], points[j], points[k], points[l])) {
                            squares.push(new Square([points[i], points[j], points[k], points[l]]));
                        }
                    }
                }
            }
        }
    }

    // Function to create line clusters with more regular spacing
    function getLinePositions() {
        const positions = [];
        let currentPos = 0;
        const totalHeight = canvas.height * 1.2;
        
        while (currentPos < totalHeight) {
            for (let i = 0; i < params.clusterSize; i++) {
                const spacing = 2 + Math.sin(i / params.clusterSize * Math.PI) * 1.5;
                positions.push(currentPos);
                currentPos += spacing;
            }
            currentPos += 20;
        }
        return positions;
    }

    // Create a smooth phase transition
    function getPhaseOffset(index, total) {
        return (index / total) * Math.PI * 2;
    }

    // Function to add natural wave movement
    function getNaturalOffset(x, y, time) {
        const xOffset = Math.sin(x * secondaryWave.frequency + time * secondaryWave.speed) * secondaryWave.amplitude;
        const yOffset = Math.cos(y * secondaryWave.frequency + time * secondaryWave.speed) * (secondaryWave.amplitude * 0.7);
        return {
            x: xOffset,
            y: yOffset
        };
    }

    // Function to draw wave lines
    function drawWaveLines(linePositions, totalLines, isReverse = false) {
        const baseColor = '90, 200, 255';
        const directionMultiplier = isReverse ? -1 : 1;
        points.length = 0; // Clear previous points
        
        linePositions.forEach((yPos, lineIndex) => {
            const linePoints = [];
            ctx.beginPath();
            
            const phaseOffset = getPhaseOffset(lineIndex, totalLines);
            // Use Arduino value for frequency if it's the first wave direction
            const frequency = isReverse ? 0.003 : params.frequency;
            const individualFreq = frequency * (1 + Math.sin(phaseOffset * 0.5) * 0.2);
            const individualAmp = params.amplitude * (0.8 + Math.sin(phaseOffset) * 0.3);
            
            // Generate random x positions for points on this line
            const pointPositions = Array.from({length: params.pointsPerLine}, () => Math.random() * canvas.width);
            
            for (let x = 0; x < canvas.width; x += 2) {
                // Main wave with shorter wavelength
                const wave1 = Math.sin(x * individualFreq + time * 1.2 * directionMultiplier + phaseOffset) * individualAmp;
                const wave2 = Math.sin(x * individualFreq * 1.5 + time * 0.8 * directionMultiplier + phaseOffset) * (individualAmp * 0.4);
                
                // Add natural movement (reverse for opposite direction)
                const naturalMove = getNaturalOffset(x, yPos, time * directionMultiplier);
                
                const y = yPos + wave1 + wave2 + naturalMove.y;
                const adjustedX = x + naturalMove.x;
                
                if (x === 0) {
                    ctx.moveTo(adjustedX, y);
                } else {
                    ctx.lineTo(adjustedX, y);
                }

                // Add points at random positions
                if (pointPositions.includes(x)) {
                    points.push(new Point(adjustedX, y, lineIndex, isReverse));
                }
            }
            
            // Dynamic opacity based on position and time
            const opacity = 0.2 + Math.sin(phaseOffset + time * 0.3) * 0.3;
            ctx.strokeStyle = `rgba(${baseColor}, ${opacity})`;
            ctx.stroke();

            // Draw points with glow effect
            points.forEach(point => {
                // Draw glow
                const gradient = ctx.createRadialGradient(
                    point.x, point.y, 0,
                    point.x, point.y, params.pointGlow
                );
                gradient.addColorStop(0, `rgba(${baseColor}, ${0.8 * point.glowIntensity})`);
                gradient.addColorStop(1, `rgba(${baseColor}, 0)`);
                
                ctx.beginPath();
                ctx.fillStyle = gradient;
                ctx.arc(point.x, point.y, params.pointGlow, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw point
                ctx.beginPath();
                ctx.fillStyle = `rgba(${baseColor}, ${point.glowIntensity})`;
                ctx.arc(point.x, point.y, params.pointRadius, 0, Math.PI * 2);
                ctx.fill();
            });
        });
    }

    function drawSquares() {
        ctx.lineWidth = 3; // Increased line width for squares
        
        for (let i = squares.length - 1; i >= 0; i--) {
            const square = squares[i];
            
            // Draw square with glow effect
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255, 255, 255, ' + square.opacity + ')';
            
            ctx.beginPath();
            ctx.moveTo(square.points[0].x, square.points[0].y);
            for (let j = 1; j < square.points.length; j++) {
                ctx.lineTo(square.points[j].x, square.points[j].y);
            }
            ctx.closePath();
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${square.opacity})`;
            ctx.stroke();
            
            // Reset shadow
            ctx.shadowBlur = 0;
            
            // Update square life and opacity
            square.life--;
            square.opacity = square.life / squareLifespan;
            
            // Remove dead squares
            if (square.life <= 0) {
                squares.splice(i, 1);
            }
        }
    }

    let time = 0;

    // Animation function
    function animate() {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const linePositions = getLinePositions();
        const totalLines = linePositions.length;
        
        ctx.lineWidth = 1;
        
        // Draw waves and collect points
        drawWaveLines(linePositions, totalLines, false);
        drawWaveLines(linePositions, totalLines, true);
        
        // Detect and draw squares
        detectSquares();
        drawSquares();
        
        time += params.speed;
        requestAnimationFrame(animate);
    }

    // Start animation
    animate();
});