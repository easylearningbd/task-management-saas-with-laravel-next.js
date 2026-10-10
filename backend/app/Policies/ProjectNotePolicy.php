<?php

namespace App\Policies;

/** A company works only with its own ProjectNote records (CompanyOwnedPolicy). */
class ProjectNotePolicy extends CompanyOwnedPolicy {}
