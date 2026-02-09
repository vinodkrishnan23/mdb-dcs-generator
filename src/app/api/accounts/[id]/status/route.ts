import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Account from '@/models/Account';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const account = await Account.findById(id)
      .select('status progressStep progressDetails dcsData error')
      .lean();
    
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: account.status || 'PENDING',
      progressStep: account.progressStep,
      progressDetails: account.progressDetails,
      dcsData: account.dcsData,
      error: account.error
    });
  } catch (error) {
    console.error('Error fetching account status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account status' },
      { status: 500 }
    );
  }
}
