"""
Test Supabase connection and database setup
Run this script to verify your Supabase integration is working
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from datetime import datetime

# Load environment variables
load_dotenv()

def test_connection():
    """Test basic database connection"""
    print("🔍 Testing Supabase Connection...")
    print("-" * 50)

    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        print("❌ ERROR: DATABASE_URL not found in environment")
        print("   Please create .env file and add your Supabase connection string")
        return False

    # Check if it's a Supabase URL
    if 'supabase.co' not in database_url:
        print("⚠️  WARNING: Not a Supabase URL (using SQLite or other database)")
        print(f"   Current: {database_url}")

    try:
        engine = create_engine(database_url)

        with engine.connect() as conn:
            # Test basic connection
            result = conn.execute(text('SELECT version();'))
            version = result.fetchone()[0]
            print(f"✅ Connected successfully!")
            print(f"   PostgreSQL Version: {version[:50]}...")

        return True

    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return False


def test_tables():
    """Test that required tables exist"""
    print("\n🔍 Checking Database Tables...")
    print("-" * 50)

    database_url = os.getenv('DATABASE_URL')
    engine = create_engine(database_url)

    required_tables = ['sessions', 'session_events', 'uploads']

    try:
        with engine.connect() as conn:
            for table in required_tables:
                result = conn.execute(text(
                    f"SELECT COUNT(*) FROM information_schema.tables "
                    f"WHERE table_schema = 'public' AND table_name = '{table}'"
                ))
                exists = result.fetchone()[0] > 0

                if exists:
                    # Get row count
                    count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    row_count = count_result.fetchone()[0]
                    print(f"✅ Table '{table}' exists ({row_count} rows)")
                else:
                    print(f"❌ Table '{table}' not found")
                    return False

        return True

    except Exception as e:
        print(f"❌ Error checking tables: {str(e)}")
        return False


def test_indexes():
    """Test that indexes are created"""
    print("\n🔍 Checking Database Indexes...")
    print("-" * 50)

    database_url = os.getenv('DATABASE_URL')
    engine = create_engine(database_url)

    try:
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT schemaname, tablename, indexname "
                "FROM pg_indexes "
                "WHERE schemaname = 'public' "
                "ORDER BY tablename, indexname"
            ))

            indexes = result.fetchall()

            if not indexes:
                print("❌ No indexes found")
                return False

            print(f"✅ Found {len(indexes)} indexes:")
            for schema, table, index in indexes[:10]:  # Show first 10
                print(f"   - {table}.{index}")

            if len(indexes) > 10:
                print(f"   ... and {len(indexes) - 10} more")

        return True

    except Exception as e:
        print(f"❌ Error checking indexes: {str(e)}")
        return False


def test_insert():
    """Test inserting and querying data"""
    print("\n🔍 Testing Data Operations...")
    print("-" * 50)

    database_url = os.getenv('DATABASE_URL')
    engine = create_engine(database_url)

    test_session_id = f"test_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    try:
        with engine.connect() as conn:
            # Insert test session
            conn.execute(text(
                "INSERT INTO sessions (session_id, participant_id, started_at) "
                "VALUES (:session_id, :participant_id, :started_at)"
            ), {
                'session_id': test_session_id,
                'participant_id': 'TEST_USER',
                'started_at': datetime.utcnow()
            })
            conn.commit()

            print(f"✅ Inserted test session: {test_session_id}")

            # Query it back
            result = conn.execute(text(
                "SELECT session_id, participant_id, started_at FROM sessions "
                "WHERE session_id = :session_id"
            ), {'session_id': test_session_id})

            row = result.fetchone()
            if row:
                print(f"✅ Retrieved test session:")
                print(f"   Session ID: {row[0]}")
                print(f"   Participant: {row[1]}")
                print(f"   Started: {row[2]}")

            # Clean up test data
            conn.execute(text(
                "DELETE FROM sessions WHERE session_id = :session_id"
            ), {'session_id': test_session_id})
            conn.commit()

            print(f"✅ Cleaned up test data")

        return True

    except Exception as e:
        print(f"❌ Data operation failed: {str(e)}")
        return False


def test_foreign_keys():
    """Test that foreign keys are working"""
    print("\n🔍 Checking Foreign Key Constraints...")
    print("-" * 50)

    database_url = os.getenv('DATABASE_URL')
    engine = create_engine(database_url)

    try:
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT tc.table_name, tc.constraint_name, "
                "       kcu.column_name, ccu.table_name AS foreign_table_name "
                "FROM information_schema.table_constraints AS tc "
                "JOIN information_schema.key_column_usage AS kcu "
                "  ON tc.constraint_name = kcu.constraint_name "
                "  AND tc.table_schema = kcu.table_schema "
                "JOIN information_schema.constraint_column_usage AS ccu "
                "  ON ccu.constraint_name = tc.constraint_name "
                "  AND ccu.table_schema = tc.table_schema "
                "WHERE tc.constraint_type = 'FOREIGN KEY' "
                "  AND tc.table_schema = 'public'"
            ))

            fks = result.fetchall()

            if not fks:
                print("⚠️  No foreign keys found")
                return False

            print(f"✅ Found {len(fks)} foreign key constraints:")
            for table, constraint, column, ref_table in fks:
                print(f"   - {table}.{column} → {ref_table}")

        return True

    except Exception as e:
        print(f"❌ Error checking foreign keys: {str(e)}")
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 50)
    print("   SUPABASE CONNECTION TEST SUITE")
    print("=" * 50)

    results = []

    # Run tests
    results.append(("Connection", test_connection()))

    if results[-1][1]:  # Only continue if connection successful
        results.append(("Tables", test_tables()))
        results.append(("Indexes", test_indexes()))
        results.append(("Foreign Keys", test_foreign_keys()))
        results.append(("Data Operations", test_insert()))

    # Summary
    print("\n" + "=" * 50)
    print("   TEST SUMMARY")
    print("=" * 50)

    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")

    all_passed = all(result[1] for result in results)

    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All tests passed! Supabase is ready to use.")
        print("\nNext steps:")
        print("1. Start the backend server: python app.py")
        print("2. Load Chrome extension")
        print("3. Record a test session")
        print("4. View data in admin dashboard or Supabase")
    else:
        print("❌ Some tests failed. Please check the errors above.")
        print("\nTroubleshooting:")
        print("1. Verify DATABASE_URL in .env file")
        print("2. Check Supabase dashboard for connection issues")
        print("3. Ensure migrations were applied successfully")
        print("4. Review backend-server/SUPABASE_SETUP.md")
    print("=" * 50 + "\n")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
