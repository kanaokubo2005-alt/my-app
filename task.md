# Task List - Google Calendar Integration Enhancements

- [x] Configure frontend to send Google access token via `X-Google-Token` header
- [x] Configure backend endpoints to accept and utilize `X-Google-Token` header
- [x] Update calendar status endpoint to dynamically return true if token header is present
- [x] Modify consent confirm button to trigger client-side googleSignIn popup directly
- [x] Rebrand all occurrences of TaskPilot to ToDone
- [x] Implement week-by-week track-layered calendar board to display multi-day event bars
- [x] Shrunk day cell vertical height from `min-h-32` to `h-16 md:h-20` (shorter calendar board)
- [x] Fetch events for one year before and after today
- [x] Set event styling to solid blue background and white text
- [x] Prevent event bars from overlapping with national holidays using dynamic offsets and height expansion
- [x] Fix login flow: Add Calendar scope to Google provider and persist access token to localStorage
- [x] Align event bars to ToDone's cobalt navy color (`#0047AB`) with white text
- [x] Fit up to 3 calendar events per day vertically by optimizing track height and spacing
- [x] Render national holidays horizontally next to the date number to save space and prevent overlap
- [x] Simplify detailed field panel and task cards in TeamSpaceView by removing priority fields and replacing recurrence settings with a single repeat emoji icon
- [x] Further reduce calendar week vertical height to `h-[62px] md:h-[72px]` and adjust event bars to `h-3`
- [x] Verify backend server launch and client-side production build
