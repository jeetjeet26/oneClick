# ForgeStudio Veo 3 Update - December 9, 2025

## ✅ Now Using Veo 3!
ForgeStudio has been updated to use **Google Veo 3** (`veo-3.0-generate-preview`), the latest version available in paid preview via Vertex AI.

## What's New in Veo 3

### Major Features
- **🔊 Synchronized Sound**: Natively generates rich audio—dialogue, effects, and music—synchronized with video in a single pass
- **🎬 Cinematic Quality**: Produces stunning, high-definition video that captures creative nuances, from intricate textures to subtle lighting effects
- **⚡ Realistic Physics**: Simulates real-world physics for authentic motion, natural character movement, accurate flow of water and casting of shadows
- **🎨 Enhanced Prompt Understanding**: Better adherence to complex prompts with creative details

### Technical Details
- **Model ID**: `veo-3.0-generate-preview`
- **API**: Vertex AI (Google Cloud)
- **Status**: Paid preview (available since July 2025)
- **Pricing**: $0.75 per second for video and audio output
- **Location**: `us-central1`
- **Duration**: 8 seconds per video (supports 4, 6, or 8 seconds)
- **Aspect Ratios**: 16:9 (landscape), 9:16 (portrait)
- **Watermarking**: All videos include SynthID digital watermark

## Updated Files
1. `app/api/forgestudio/generate/route.ts` - Main content generation endpoint
2. `app/api/forgestudio/assets/generate/route.ts` - Asset-specific generation endpoint

## Video Generation Capabilities

### Text-to-Video
Generate videos from text descriptions with enhanced realism and physics.

```typescript
POST /api/forgestudio/assets/generate
{
  "propertyId": "...",
  "generationType": "text-to-video",
  "prompt": "Modern apartment pool with sunset lighting, smooth camera pan",
  "style": "luxury",
  "aspectRatio": "16:9",
  "videoDuration": 8,  // 4, 6, or 8 seconds
  "includeAudio": true  // Enable synchronized audio generation
}
```

### Image-to-Video
Animate static images with realistic motion.

```typescript
POST /api/forgestudio/assets/generate
{
  "propertyId": "...",
  "generationType": "image-to-video",
  "prompt": "Add gentle camera movement showcasing the space",
  "sourceImageUrl": "https://...",
  "style": "professional",
  "aspectRatio": "16:9",
  "videoDuration": 6,  // 4, 6, or 8 seconds
  "includeAudio": false  // Optional: disable audio for silent videos
}
```

## Best Practices for Veo 3

### Prompt Engineering
1. **Be Specific**: Include details about camera movement, lighting, and atmosphere
2. **Use Style Keywords**: Leverage the style presets (luxury, modern, natural, vibrant, cozy, professional)
3. **Describe Motion**: Specify how elements should move (e.g., "smooth pan", "slow zoom")
4. **Set the Scene**: Include environmental details (time of day, weather, mood)

### Example Prompts
```
Good: "Luxury apartment living room at golden hour, warm sunlight streaming through floor-to-ceiling windows, smooth camera dolly forward revealing modern furniture and city views"

Better than: "Nice apartment room"
```

### Style Presets
- **natural**: Photorealistic with natural lighting and smooth camera movement
- **luxury**: Premium, elegant, sophisticated cinematic feel
- **modern**: Minimalist, clean lines, sleek transitions
- **vibrant**: Colorful, bright, energetic atmosphere
- **cozy**: Warm tones, comfortable, inviting atmosphere
- **professional**: Corporate, polished, high production value

## Performance Notes
- Video generation takes approximately 30-180 seconds
- The API uses long-running operations with polling
- Maximum polling time: 3 minutes (36 attempts × 5 seconds)
- Videos are returned as base64-encoded MP4 or GCS URIs

## Quality Improvements
If video quality is not meeting expectations:

1. **Refine Prompts**: Add more specific details about desired output
2. **Use Style Presets**: Apply appropriate style keywords
3. **Specify Camera Movement**: Include camera direction and speed
4. **Add Context**: Describe lighting, atmosphere, and mood
5. **Test Different Aspect Ratios**: Try both 16:9 and 9:16

## Configuration Requirements
Ensure these environment variables are set:
- `GOOGLE_CLOUD_PROJECT_ID`: Your Google Cloud project ID
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account JSON file

## Migration from Veo 2
No breaking changes - the API interface remains the same. All existing code will automatically use Veo 3 with improved quality.

## Support
For issues or questions about Veo 3 video generation:
1. Check the web terminal for detailed error messages
2. Verify Google Cloud credentials are properly configured
3. Review prompt engineering best practices above
4. Check that the model ID is `veo-3.0-generate-001`

## Resources
- [Google Veo 3 Announcement](https://developers.googleblog.com/veo-3-now-available-gemini-api/)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- ForgeStudio Dashboard: `/dashboard/forgestudio`

