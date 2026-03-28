-- Add audio_url column to cards table for ElevenLabs pre-generated MP3s
alter table cards add column if not exists audio_url text;
