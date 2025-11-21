import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Exam Upload API Called ===');
    const formData = await request.formData();
    
    // Extract form fields
    const file = formData.get('file') as File | null;
    const courseId = formData.get('courseId');
    const courseCode = formData.get('courseCode');
    const term = formData.get('term');
    const year = formData.get('year');
    const examType = formData.get('examType');
    const title = formData.get('title');

    console.log('Form data received:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      courseId,
      courseCode,
      term,
      year,
      examType,
      title
    });

    // Validate required fields
    if (!file) {
      console.error('Validation failed: File is missing');
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!courseId || !courseCode || !examType || !title) {
      console.error('Validation failed: Missing required fields', { courseId, courseCode, examType, title });
      return NextResponse.json(
        { error: 'Missing required fields: courseId, courseCode, examType, and title are required' },
        { status: 400 }
      );
    }

    // Validate exam type
    const validExamTypes = ['midterm', 'final', 'quiz', 'test'];
    if (!validExamTypes.includes(examType as string)) {
      return NextResponse.json(
        { error: `Invalid examType. Must be one of: ${validExamTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse courseId as number (Supabase handles bigint conversion)
    const courseIdNum = parseInt(courseId as string, 10);
    if (isNaN(courseIdNum)) {
      return NextResponse.json(
        { error: 'Invalid courseId. Must be a valid number' },
        { status: 400 }
      );
    }
    
    // Parse year if provided
    const yearInt = year ? parseInt(year as string, 10) : null;
    if (year && isNaN(yearInt!)) {
      return NextResponse.json(
        { error: 'Year must be a valid integer' },
        { status: 400 }
      );
    }

    // Create admin client
    console.log('Creating admin Supabase client...');
    let supabaseAdmin;
    try {
      supabaseAdmin = createAdminClient();
      console.log('Admin client created successfully');
    } catch (adminError) {
      console.error('Failed to create admin client:', adminError);
      return NextResponse.json(
        { error: 'Server configuration error: Failed to create admin client', details: adminError instanceof Error ? adminError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Build storage path: COMPSCI-1020A/Fall-2024/midterm-<timestamp>.pdf
    const sanitizedCourseCode = (courseCode as string).replace(/\s+/g, '-').toUpperCase();
    const sanitizedTerm = term ? (term as string).replace(/\s+/g, '-') : 'Unknown';
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'pdf';
    const sanitizedTitle = (title as string).toLowerCase().replace(/\s+/g, '-');
    const storagePath = `${sanitizedCourseCode}/${sanitizedTerm}/${sanitizedTitle}-${timestamp}.${fileExtension}`;

    // Convert File to ArrayBuffer for upload
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    // Upload file to Supabase Storage
    console.log('Uploading file to storage:', storagePath);
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('exams')
      .upload(storagePath, fileBytes, {
        contentType: file.type || 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      console.error('Error details:', JSON.stringify(uploadError, null, 2));
      return NextResponse.json(
        { error: 'Failed to upload file to storage', details: uploadError.message },
        { status: 500 }
      );
    }
    console.log('File uploaded successfully:', uploadData);

    // Insert exam record into database
    console.log('Inserting exam record into database:', {
      course_id: courseIdNum,
      title,
      exam_type: examType,
      term,
      year: yearInt,
      storage_bucket: 'exams',
      storage_path: storagePath
    });
    
    const { data: examData, error: dbError } = await supabaseAdmin
      .from('course_exams')
      .insert({
        course_id: courseIdNum,
        title: title as string,
        exam_type: examType as string,
        term: term as string || null,
        year: yearInt,
        storage_bucket: 'exams',
        storage_path: storagePath
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      console.error('Error details:', JSON.stringify(dbError, null, 2));
      
      // If DB insert fails, try to clean up the uploaded file
      try {
        await supabaseAdmin.storage
          .from('exams')
          .remove([storagePath]);
        console.log('Cleaned up uploaded file after DB error');
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }

      return NextResponse.json(
        { error: 'Failed to insert exam record', details: dbError.message, code: dbError.code, hint: dbError.hint },
        { status: 500 }
      );
    }
    console.log('Exam record inserted successfully:', examData);

    return NextResponse.json({
      success: true,
      exam: examData
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in exam upload:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

